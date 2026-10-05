"use client";

import { Banknote, CreditCard, LoaderCircle, Printer, ReceiptText, Smartphone, Undo2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { generateBill, markBillPaid, voidBill } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import type { LiveBill, LiveOrder } from "@/lib/data/live";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";

type ToBill = {
  key: string;
  title: string;
  target: { tableId: string } | { orderId: string };
  orders: LiveOrder[];
  /** rounds at this table that are not served yet – the bill waits for them */
  waitingOn: LiveOrder[];
};

/** Served dine-in rounds grouped by table (one bill per visit); takeaway billed per order. */
function toBill(orders: LiveOrder[]): ToBill[] {
  const out: ToBill[] = [];
  const byTable = new Map<string, LiveOrder[]>();
  for (const o of orders) {
    if (o.billId || o.status === "CANCELLED" || o.status === "PAID") continue;
    if (o.type === "PARCEL") {
      if (o.status === "READY" || o.status === "SERVED") {
        out.push({
          key: o.id,
          title: `Takeaway #${o.number}`,
          target: { orderId: o.id },
          orders: [o],
          waitingOn: [],
        });
      }
    } else if (o.tableId) {
      byTable.set(o.tableId, [...(byTable.get(o.tableId) ?? []), o]);
    }
  }
  for (const [tableId, unsorted] of byTable) {
    const list = [...unsorted].sort((a, b) => a.number - b.number);
    const served = list.filter((o) => o.status === "SERVED");
    if (served.length === 0) continue;
    out.push({
      key: tableId,
      title: `Table ${list[0].table}`,
      target: { tableId },
      orders: served,
      waitingOn: list.filter((o) => o.status !== "SERVED"),
    });
  }
  return out;
}

export function BillingPanel({
  orders,
  bills,
  onChanged,
}: {
  orders: LiveOrder[];
  bills: LiveBill[];
  onChanged: () => void;
}) {
  const pending = toBill(orders);
  if (pending.length === 0 && bills.length === 0) return null;
  return (
    <>
      {pending.length > 0 && (
        <section className="space-y-3" aria-label="To bill">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ReceiptText className="size-5 text-brand-text" aria-hidden /> To bill
            <span className="text-sm font-normal text-muted-foreground">{pending.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((b) => (
              <ToBillCard key={b.key} entry={b} onChanged={onChanged} />
            ))}
          </ul>
        </section>
      )}
      {bills.length > 0 && (
        <section className="space-y-3" aria-label="Awaiting payment">
          <h2 className="text-lg font-bold">
            Awaiting payment <span className="text-sm font-normal text-muted-foreground">{bills.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bills.map((b) => (
              <BillCard key={b.id} bill={b} onChanged={onChanged} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ToBillCard({ entry, onChanged }: { entry: ToBill; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const total = entry.orders.reduce((s, o) => s + o.totalPaise, 0);
  const items = entry.orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  return (
    <li className="flex flex-col rounded-3xl border border-border bg-card p-4">
      <p className="text-lg font-bold">{entry.title}</p>
      <p className="text-xs text-muted-foreground">
        {entry.orders[entry.orders.length - 1].customerName} ·{" "}
        {entry.orders.length === 1 ? "order" : "orders"} {entry.orders.map((o) => `#${o.number}`).join(", ")}{" "}
        · {items} item{items === 1 ? "" : "s"}
      </p>
      {entry.waitingOn.length > 0 && (
        <p className="mt-2 rounded-xl bg-accent px-3 py-2 text-sm">
          {entry.waitingOn.map((o) => `#${o.number}`).join(", ")} still in progress – serve or cancel before
          billing.
        </p>
      )}
      <p className="mt-3 text-right tabular text-2xl font-bold">{formatINR(toRupees(total))}</p>
      <Button
        className="mt-3 rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
        disabled={pending || entry.waitingOn.length > 0}
        onClick={() =>
          start(async () => {
            const res = await generateBill(entry.target);
            if (res.ok) {
              toast.success(`Bill #${res.number} ready`);
              onChanged();
            } else toast.error(res.error);
          })
        }
      >
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <ReceiptText data-icon="inline-start" />
        )}
        Generate bill
      </Button>
    </li>
  );
}

const METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "CARD", label: "Card", icon: CreditCard },
] as const;

function BillCard({ bill, onChanged }: { bill: LiveBill; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        onChanged();
      } else toast.error(res.error);
    });

  return (
    <li className="flex flex-col rounded-3xl border-2 border-hh-green/40 bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-lg font-bold">
            Bill #{bill.number} · {bill.table ? `Table ${bill.table}` : "Takeaway"}
          </p>
          <p className="text-xs text-muted-foreground">
            {bill.customerName} · orders {bill.orderNumbers.map((n) => `#${n}`).join(", ")}
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/admin/print/bill/${bill.id}`} target="_blank">
            <Printer data-icon="inline-start" /> Print
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-right tabular text-2xl font-bold">{formatINR(toRupees(bill.totalPaise))}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">Paid by</p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <Button
            key={m.id}
            disabled={pending}
            className="rounded-full"
            onClick={() => run(() => markBillPaid(bill.id, m.id), `Bill #${bill.number} paid by ${m.label}`)}
          >
            <m.icon data-icon="inline-start" /> {m.label}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="mt-2 self-start rounded-full text-muted-foreground"
        onClick={() => run(() => voidBill(bill.id), `Bill #${bill.number} undone`)}
      >
        <Undo2 data-icon="inline-start" /> Undo bill
      </Button>
    </li>
  );
}
