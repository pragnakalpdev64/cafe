import type { OrderStatus, OrderType } from "@/generated/prisma/enums";

// The order lifecycle after the guest places it (status NEW). Pure, so it's unit-tested.
//   dine-in:  NEW → ACCEPTED (staff checked it) → PREPARING (in kitchen) → SERVED
//   takeaway: NEW → ACCEPTED → PREPARING → READY (to collect) → SERVED (picked up)
// Cancel is allowed until the food is served (or the bill is paid). PAID is set by the bill –
// except a takeaway paid while still waiting at the counter: it stays READY and "Picked up" finishes it as PAID.

export type OrderAction = "accept" | "toKitchen" | "served" | "readyToCollect" | "pickedUp";

const NEXT: Record<OrderAction, { from: OrderStatus[]; to: OrderStatus; types: OrderType[] }> = {
  accept: { from: ["NEW"], to: "ACCEPTED", types: ["DINE_IN", "PARCEL"] },
  toKitchen: { from: ["ACCEPTED"], to: "PREPARING", types: ["DINE_IN", "PARCEL"] },
  served: { from: ["PREPARING"], to: "SERVED", types: ["DINE_IN"] },
  readyToCollect: { from: ["PREPARING"], to: "READY", types: ["PARCEL"] },
  pickedUp: { from: ["READY"], to: "SERVED", types: ["PARCEL"] },
};

/** The status an action leads to, or null if it isn't allowed from here. */
export function nextStatus(action: OrderAction, status: OrderStatus, type: OrderType): OrderStatus | null {
  const rule = NEXT[action];
  return rule.from.includes(status) && rule.types.includes(type) ? rule.to : null;
}

/** Actions staff can take on an order right now (in button order). */
export function availableActions(status: OrderStatus, type: OrderType): OrderAction[] {
  return (Object.keys(NEXT) as OrderAction[]).filter((a) => nextStatus(a, status, type) !== null);
}

export const canCancel = (status: OrderStatus, paid = false) =>
  !paid && ["NEW", "ACCEPTED", "PREPARING", "READY"].includes(status);

/** The status an order gets when its bill is paid. */
export const statusOnPayment = (status: OrderStatus): OrderStatus => (status === "READY" ? "READY" : "PAID");

/** Items can be changed only before the kitchen starts. */
export const canEditItems = (status: OrderStatus) => status === "NEW" || status === "ACCEPTED";

export const ACTION_LABEL: Record<OrderAction, string> = {
  accept: "Accept",
  toKitchen: "Send to kitchen",
  served: "Served",
  readyToCollect: "Ready to collect",
  pickedUp: "Picked up",
};
