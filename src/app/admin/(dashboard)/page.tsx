import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { maskPhone } from "@/lib/phone-mask";

// same segment as the dashboard layout, so its title template does not apply here
export const metadata = { title: { absolute: "Orders · Dashboard" } };

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-status-new/15 text-status-new" },
  ACCEPTED: { label: "Accepted", className: "bg-status-accepted/15 text-status-accepted" },
  PREPARING: { label: "In kitchen", className: "bg-status-preparing/15 text-status-preparing" },
  READY: { label: "Ready", className: "bg-status-ready/15 text-status-ready" },
  SERVED: { label: "Served", className: "bg-status-done/15 text-status-done" },
  PAID: { label: "Paid", className: "bg-status-done/15 text-status-done" },
  CANCELLED: { label: "Cancelled", className: "bg-status-cancelled/15 text-status-cancelled" },
};

/** Today's orders. Read-only for now – live actions (accept, kitchen, served) arrive in P2B-04. */
export default async function OrdersPage() {
  const user = await requireUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: startOfDay } },
    orderBy: { createdAt: "desc" },
    include: { items: true, table: { select: { label: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Today&apos;s orders, newest first. Accept and kitchen buttons are coming next.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin">
            <RefreshCw data-icon="inline-start" /> Refresh
          </Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          No orders yet today.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-lg font-bold">
                    #{o.number} · {o.table ? `Table ${o.table.label}` : "Takeaway"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.customerName}
                    {o.customerPhone &&
                      ` · ${user.role === "OWNER" ? o.customerPhone : maskPhone(o.customerPhone)}`}{" "}
                    · {o.createdAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[o.status].className}`}
                >
                  {STATUS[o.status].label}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i) => {
                  const addOns = (i.addOns as { name: string }[]).map((a) => a.name);
                  return (
                    <li key={i.id} className="flex gap-2">
                      <span className="w-7 shrink-0 tabular font-bold text-brand-text">{i.quantity}×</span>
                      <span className="flex-1">
                        {i.itemName}
                        {addOns.length > 0 && (
                          <span className="block text-xs text-muted-foreground">+ {addOns.join(", ")}</span>
                        )}
                      </span>
                      <span className="tabular text-muted-foreground">
                        {formatINR(toRupees(i.lineTotalPaise))}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {o.note && <p className="mt-2 rounded-xl bg-accent px-3 py-2 text-sm">Note: {o.note}</p>}
              <p className="mt-3 border-t border-border pt-2 text-right tabular font-semibold">
                {formatINR(toRupees(o.totalPaise))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
