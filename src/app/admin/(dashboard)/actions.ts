"use server";

import { z } from "zod";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { getCafeDetails } from "@/lib/data/menu";
import { loadMenuPrices } from "@/lib/data/menu-prices";
import { db } from "@/lib/db";
import { billTotals, priceLines } from "@/lib/pricing";
import { publish } from "@/lib/realtime";
import { type ConfirmSelectionInput, ConfirmSelectionSchema } from "@/lib/validators/confirm-order";
import { INDIAN_MOBILE } from "@/lib/validators/phone";

type Fail = { ok: false; error: string; problems?: string[] };

async function staff(): Promise<CurrentUser | Fail> {
  try {
    return await assertUser();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * The cashier confirms a guest's selection at the table, adding the guest's name and phone.
 * Prices come from the menu now; the order starts as ACCEPTED (confirmed with the guest).
 */
export async function confirmSelection(
  input: ConfirmSelectionInput,
): Promise<{ ok: true; number: number } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = ConfirmSelectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { selectionId, name, phone, note, marketingConsent, items } = parsed.data;

  const selection = await db.selection.findUnique({ where: { id: selectionId } });
  if (!selection) return { ok: false, error: "This list is gone – the guest may have cleared it." };
  if (selection.status === "CONFIRMED") return { ok: false, error: "This list was already confirmed." };

  const priced = priceLines(items, await loadMenuPrices(items.map((i) => i.itemId)));
  if (!priced.ok) return { ok: false, error: "Fix these before confirming:", problems: priced.problems };
  const totals = billTotals(priced.subtotalPaise, (await getCafeDetails()).taxBasisPoints);

  const order = await db.$transaction(async (tx) => {
    const now = new Date();
    const customer = await tx.customer.upsert({
      where: { phone },
      create: { name, phone, marketingConsent, consentAt: marketingConsent ? now : null },
      // a later order never withdraws consent on its own – that happens on request
      update: { name, lastVisitAt: now, ...(marketingConsent && { marketingConsent: true, consentAt: now }) },
      select: { id: true },
    });
    const created = await tx.order.create({
      data: {
        type: selection.takeaway ? "PARCEL" : "DINE_IN",
        status: "ACCEPTED",
        tableId: selection.tableId,
        customerId: customer.id,
        customerName: name,
        customerPhone: phone,
        note: note || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        createdById: me.id,
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
        statusLogs: {
          create: [
            {
              toStatus: "NEW",
              note: "Selected by the guest on the QR menu",
              createdAt: selection.readyAt ?? selection.createdAt,
            },
            {
              fromStatus: "NEW",
              toStatus: "ACCEPTED",
              changedById: me.id,
              note: `Confirmed with the guest by ${me.name}`,
            },
          ],
        },
      },
      select: { id: true, number: true },
    });
    // keep the row briefly (CONFIRMED) so the guest's phone can catch up if it was offline
    await tx.selection.update({
      where: { id: selectionId },
      data: { status: "CONFIRMED", orderId: created.id },
    });
    return created;
  });

  await publish({ type: "order", orderId: order.id, number: order.number, selectionId });
  return { ok: true, number: order.number };
}

/** Guest left without ordering – take their list off the board. */
export async function removeSelection(selectionId: string): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = z.uuid().safeParse(selectionId);
  if (!id.success) return { ok: false, error: "Nothing to remove." };
  await db.selection.deleteMany({ where: { id: id.data, status: { not: "CONFIRMED" } } });
  await publish({ type: "selection", selectionId: id.data });
  return { ok: true };
}

/** Fills in a returning customer's name for the cashier. */
export async function lookupCustomer(phone: string): Promise<{ name?: string; visits?: number }> {
  const me = await staff();
  if ("ok" in me) return {};
  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!INDIAN_MOBILE.test(digits)) return {};
  const customer = await db.customer.findUnique({
    where: { phone: digits },
    select: { name: true, orderCount: true },
  });
  return customer ? { name: customer.name, visits: customer.orderCount } : {};
}
