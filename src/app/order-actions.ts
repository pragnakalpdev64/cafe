"use server";

import { getCafeDetails } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { billTotals, type MenuItemPrice, priceLines } from "@/lib/pricing";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { type PlaceOrderInput, PlaceOrderSchema } from "@/lib/validators/order";
import { INDIAN_MOBILE } from "@/lib/validators/phone";

export type PlaceOrderResult =
  { ok: true; orderId: string; number: number } | { ok: false; error: string; problems?: string[] };

/**
 * Customer taps "Confirm order". Prices come from the database, never the browser;
 * the order starts as NEW and waits for staff to accept it.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = PlaceOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { tableSlug, name, phone, note, marketingConsent, items } = parsed.data;

  const cafe = await getCafeDetails();
  if (!cafe.orderingEnabled) {
    return { ok: false, error: "Ordering from the menu is paused right now. Please order at the counter." };
  }

  const ip = await clientIp();
  if (!(await consumeRateLimit(`order:ip:${ip}`, 20, 60 * 60))) {
    return { ok: false, error: "Too many orders from this device. Please ask staff for help." };
  }
  if (!(await consumeRateLimit(`order:phone:${phone}`, 6, 60 * 60))) {
    return { ok: false, error: "Too many orders for this phone number in the last hour. Please ask staff." };
  }

  const table = tableSlug
    ? await db.cafeTable.findFirst({
        where: { qrSlug: tableSlug, active: true },
        select: { id: true, label: true },
      })
    : null;
  if (tableSlug && !table) return { ok: false, error: "That table isn't taking orders. Please ask staff." };

  // Guard against duplicate or prank orders: one order per table waits for staff at a time.
  if (table) {
    const waiting = await db.order.findFirst({
      where: { tableId: table.id, status: "NEW" },
      select: { number: true },
    });
    if (waiting) {
      return {
        ok: false,
        error: `Table ${table.label} already has order #${waiting.number} waiting for staff. Once it's accepted you can add more.`,
      };
    }
  }

  const menuItems = await db.menuItem.findMany({
    where: {
      id: { in: [...new Set(items.map((i) => i.itemId))] },
      visible: true,
      category: { visible: true },
    },
    select: {
      id: true,
      name: true,
      pricePaise: true,
      available: true,
      addOns: { select: { id: true, name: true, pricePaise: true, available: true } },
    },
  });
  const menu = new Map<string, MenuItemPrice>(
    menuItems.map((m) => [
      m.id,
      {
        name: m.name,
        pricePaise: m.pricePaise,
        available: m.available,
        addOns: new Map(
          m.addOns.map((a) => [a.id, { name: a.name, pricePaise: a.pricePaise, available: a.available }]),
        ),
      },
    ]),
  );
  const priced = priceLines(items, menu);
  if (!priced.ok) {
    return {
      ok: false,
      error: "Some things in your list changed. Please check and try again.",
      problems: priced.problems,
    };
  }
  const totals = billTotals(priced.subtotalPaise, cafe.taxBasisPoints);

  const order = await db.$transaction(async (tx) => {
    const now = new Date();
    const customer = await tx.customer.upsert({
      where: { phone },
      create: { name, phone, marketingConsent, consentAt: marketingConsent ? now : null },
      // a later order never withdraws consent on its own – that happens on request
      update: { name, lastVisitAt: now, ...(marketingConsent && { marketingConsent: true, consentAt: now }) },
      select: { id: true },
    });
    return tx.order.create({
      data: {
        type: table ? "DINE_IN" : "PARCEL",
        status: "NEW",
        tableId: table?.id,
        customerId: customer.id,
        customerName: name,
        customerPhone: phone,
        note: note || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        items: {
          create: priced.lines.map((l) => ({
            menuItemId: l.menuItemId,
            itemName: l.itemName,
            unitPricePaise: l.unitPricePaise,
            quantity: l.quantity,
            addOns: l.addOns,
            lineTotalPaise: l.lineTotalPaise,
          })),
        },
        statusLogs: { create: { toStatus: "NEW", note: "Placed by customer" } },
      },
      select: { id: true, number: true },
    });
  });

  return { ok: true, orderId: order.id, number: order.number };
}

/** Fills in a returning customer's name from their phone number. Returns only the name. */
export async function lookupCustomerName(phone: string): Promise<{ name?: string }> {
  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!INDIAN_MOBILE.test(digits)) return {};
  if (!(await consumeRateLimit(`lookup:${await clientIp()}`, 15, 10 * 60))) return {};
  const customer = await db.customer.findUnique({ where: { phone: digits }, select: { name: true } });
  return customer ? { name: customer.name } : {};
}
