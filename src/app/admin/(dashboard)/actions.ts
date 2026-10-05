"use server";

import { z } from "zod";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { getCafeDetails } from "@/lib/data/menu";
import { loadMenuPrices } from "@/lib/data/menu-prices";
import { db } from "@/lib/db";
import { ACTION_LABEL, canCancel, canEditItems, nextStatus, type OrderAction } from "@/lib/order-flow";
import { billTotals, priceLines } from "@/lib/pricing";
import { publish } from "@/lib/realtime";
import { type ConfirmSelectionInput, ConfirmSelectionSchema } from "@/lib/validators/confirm-order";
import { INDIAN_MOBILE } from "@/lib/validators/phone";
import { SelectionLinesSchema } from "@/lib/validators/selection";

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

  await publish({ type: "order", orderId: order.id, number: order.number, status: "ACCEPTED", selectionId });
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

/* --------------------------- after confirmation --------------------------- */

const OrderId = z.string().min(1).max(40);

/** Change a confirmed order's items before it goes to the kitchen. Re-priced from the menu. */
export async function updateOrderItems(
  orderId: string,
  items: z.input<typeof SelectionLinesSchema>,
): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = OrderId.safeParse(orderId);
  const lines = SelectionLinesSchema.min(1, "An order needs at least one item – cancel it instead").safeParse(
    items,
  );
  if (!id.success) return { ok: false, error: "Order not found." };
  if (!lines.success) return { ok: false, error: lines.error.issues[0].message };

  const order = await db.order.findUnique({
    where: { id: id.data },
    select: { id: true, number: true, status: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!canEditItems(order.status))
    return { ok: false, error: "This order is already in the kitchen – items can't be changed." };

  const priced = priceLines(lines.data, await loadMenuPrices(lines.data.map((i) => i.itemId)));
  if (!priced.ok) return { ok: false, error: "Fix these first:", problems: priced.problems };
  const totals = billTotals(priced.subtotalPaise, (await getCafeDetails()).taxBasisPoints);

  await db.$transaction([
    db.orderItem.deleteMany({ where: { orderId: order.id } }),
    db.order.update({
      where: { id: order.id },
      data: {
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
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: order.status,
            changedById: me.id,
            note: `Items changed by ${me.name}`,
          },
        },
      },
    }),
  ]);
  await publish({ type: "order", orderId: order.id, number: order.number, status: order.status });
  return { ok: true };
}

/** Send to kitchen, served, ready to collect, picked up. */
export async function advanceOrder(orderId: string, action: OrderAction): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const id = OrderId.safeParse(orderId);
  if (!id.success || !(action in ACTION_LABEL)) return { ok: false, error: "Order not found." };
  const order = await db.order.findUnique({
    where: { id: id.data },
    select: { id: true, number: true, status: true, type: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  const to = nextStatus(action, order.status, order.type);
  if (!to)
    return {
      ok: false,
      error: `Order #${order.number} can't do “${ACTION_LABEL[action]}” right now – refresh the screen.`,
    };

  // only move it if nobody else moved it in the meantime
  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: to },
  });
  if (moved.count === 0)
    return { ok: false, error: `Order #${order.number} was just changed by someone else.` };
  await db.orderStatusLog.create({
    data: { orderId: order.id, fromStatus: order.status, toStatus: to, changedById: me.id },
  });
  await publish({ type: "order", orderId: order.id, number: order.number, status: to });
  return { ok: true };
}

const CancelSchema = z.object({
  orderId: OrderId,
  reason: z
    .string()
    .trim()
    .min(3, "Say why the order is cancelled")
    .max(200, "Keep the reason under 200 characters"),
});

export async function cancelOrder(orderId: string, reason: string): Promise<{ ok: true } | Fail> {
  const me = await staff();
  if ("ok" in me) return me;
  const parsed = CancelSchema.safeParse({ orderId, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, number: true, status: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!canCancel(order.status))
    return { ok: false, error: `Order #${order.number} is already ${order.status.toLowerCase()}.` };

  const moved = await db.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: "CANCELLED", cancelReason: parsed.data.reason },
  });
  if (moved.count === 0)
    return { ok: false, error: `Order #${order.number} was just changed by someone else.` };
  await db.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "CANCELLED",
      changedById: me.id,
      note: parsed.data.reason,
    },
  });
  await publish({ type: "order", orderId: order.id, number: order.number, status: "CANCELLED" });
  return { ok: true };
}
