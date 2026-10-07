import "server-only";
import type { OrderStatus, OrderType, Role, SelectionStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { maskPhone } from "@/lib/phone-mask";
import type { SelectionLine } from "@/lib/validators/selection";

export type LiveSelection = {
  id: string;
  table: string | null;
  takeaway: boolean;
  code: number;
  status: Exclude<SelectionStatus, "CONFIRMED">;
  readyAt: string | null;
  updatedAt: string;
  items: SelectionLine[];
};

export type LiveOrderItem = {
  id: string;
  /** null if the dish was deleted from the menu since */
  itemId: string | null;
  name: string;
  quantity: number;
  addOns: { id: string; name: string }[];
  lineTotalPaise: number;
};

export type LiveOrder = {
  id: string;
  number: number;
  type: OrderType;
  status: OrderStatus;
  cancelReason: string | null;
  tableId: string | null;
  table: string | null;
  billId: string | null;
  /** its bill is paid (a takeaway can be paid before it is picked up) */
  paid: boolean;
  customerName: string;
  customerPhone: string | null;
  note: string | null;
  totalPaise: number;
  createdAt: string;
  items: LiveOrderItem[];
};

export type LiveBill = {
  id: string;
  number: number;
  table: string | null;
  customerName: string;
  totalPaise: number;
  orderNumbers: number[];
  createdAt: string;
};

export type LiveBoard = {
  selections: LiveSelection[];
  orders: LiveOrder[];
  bills: LiveBill[];
  serverTime: string;
};

/** Everything the live dashboard shows: guests picking right now, and today's confirmed orders. */
export async function getLiveBoard(role: Role): Promise<LiveBoard> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [selections, orders, bills] = await Promise.all([
    db.selection.findMany({
      where: { status: { not: "CONFIRMED" }, updatedAt: { gt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
      orderBy: [{ readyAt: "asc" }, { createdAt: "asc" }],
      include: { table: { select: { label: true } } },
    }),
    db.order.findMany({
      where: { createdAt: { gte: startOfDay } },
      orderBy: { createdAt: "desc" },
      include: { items: true, table: { select: { label: true } }, bill: { select: { paidAt: true } } },
    }),
    db.bill.findMany({
      where: { paidAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        table: { select: { label: true } },
        orders: { select: { number: true }, orderBy: { number: "asc" } },
      },
    }),
  ]);
  return {
    selections: selections.map((s) => ({
      id: s.id,
      table: s.table?.label ?? null,
      takeaway: s.takeaway,
      code: s.code,
      status: s.status as LiveSelection["status"],
      readyAt: s.readyAt?.toISOString() ?? null,
      updatedAt: s.updatedAt.toISOString(),
      items: s.items as SelectionLine[],
    })),
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      type: o.type,
      status: o.status,
      cancelReason: o.cancelReason,
      tableId: o.tableId,
      table: o.table?.label ?? null,
      billId: o.billId,
      paid: !!o.bill?.paidAt,
      customerName: o.customerName,
      customerPhone: o.customerPhone && (role === "OWNER" ? o.customerPhone : maskPhone(o.customerPhone)),
      note: o.note,
      totalPaise: o.totalPaise,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        id: i.id,
        itemId: i.menuItemId,
        name: i.itemName,
        quantity: i.quantity,
        addOns: (i.addOns as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name })),
        lineTotalPaise: i.lineTotalPaise,
      })),
    })),
    bills: bills.map((b) => ({
      id: b.id,
      number: b.number,
      table: b.table?.label ?? null,
      customerName: b.customerName,
      totalPaise: b.totalPaise,
      orderNumbers: b.orders.map((o) => o.number),
      createdAt: b.createdAt.toISOString(),
    })),
    serverTime: new Date().toISOString(),
  };
}
