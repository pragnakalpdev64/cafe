import { Check, ChefHat, CircleX, PartyPopper } from "lucide-react";
import type { GuestOrder } from "@/app/selection-actions";
import { cn } from "@/lib/utils";

type Step = { label: string; done: boolean; current: boolean };

/** Where the order is, in words the guest understands. */
export function guestStatusLabel(o: Pick<GuestOrder, "status" | "type">) {
  switch (o.status) {
    case "NEW":
      return "Waiting for staff";
    case "ACCEPTED":
      return "Confirmed";
    case "PREPARING":
      return "In the kitchen";
    case "READY":
      return "Ready to collect";
    case "SERVED":
      return o.type === "PARCEL" ? "Picked up" : "Served";
    case "PAID":
      return "Paid – thank you!";
    case "CANCELLED":
      return "Cancelled";
  }
}

function steps(o: GuestOrder): Step[] {
  const flow =
    o.type === "PARCEL" ? ["ACCEPTED", "PREPARING", "READY", "SERVED"] : ["ACCEPTED", "PREPARING", "SERVED"];
  const labels: Record<string, string> = {
    ACCEPTED: "Confirmed",
    PREPARING: "In the kitchen",
    READY: "Ready to collect",
    SERVED: o.type === "PARCEL" ? "Picked up" : "Served",
  };
  const status = o.status === "PAID" ? "SERVED" : o.status === "NEW" ? "ACCEPTED" : o.status;
  const at = flow.indexOf(status);
  return flow.map((s, i) => ({
    label: labels[s],
    done: i < at || (i === at && status === "SERVED"),
    current: i === at,
  }));
}

export const isActive = (o: GuestOrder) => !["SERVED", "PAID", "CANCELLED"].includes(o.status);

/** The guest's orders with a live progress bar. No prices – the bill is at the counter. */
export function OrderTracker({ orders }: { orders: GuestOrder[] }) {
  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-lg font-bold">
              Order #{o.number}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {o.table ? `Table ${o.table}` : "Takeaway"}
              </span>
            </p>
            {o.status === "PREPARING" && <ChefHat className="size-5 text-brand-text" aria-hidden />}
            {(o.status === "SERVED" || o.status === "PAID") && (
              <PartyPopper className="size-5 text-hh-green" aria-hidden />
            )}
          </div>

          {o.status === "CANCELLED" ? (
            <p
              className="mt-3 flex items-start gap-2 rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="status"
            >
              <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                This order was cancelled{o.cancelReason ? `: ${o.cancelReason}` : ""}. Please ask staff if
                that&apos;s not right.
              </span>
            </p>
          ) : (
            <ol className="mt-4 flex items-start" aria-label={`Order ${o.number}: ${guestStatusLabel(o)}`}>
              {steps(o).map((s, i, all) => (
                <li key={s.label} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span
                      className={cn(
                        "h-0.5 flex-1",
                        i === 0 ? "invisible" : s.done || s.current ? "bg-hh-green" : "bg-border",
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                        s.done
                          ? "border-hh-green bg-hh-green text-white"
                          : s.current
                            ? "border-hh-orange bg-hh-orange text-hh-ink"
                            : "border-border bg-background text-muted-foreground",
                      )}
                      aria-current={s.current ? "step" : undefined}
                    >
                      {s.done ? <Check className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        "h-0.5 flex-1",
                        i === all.length - 1 ? "invisible" : s.done ? "bg-hh-green" : "bg-border",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-[11px] leading-tight",
                      s.current ? "font-bold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            {o.items.map((i, k) => (
              <li key={k} className="flex gap-2">
                <span className="w-7 shrink-0 tabular font-bold text-brand-text">{i.quantity}×</span>
                <span>
                  {i.name}
                  {i.addOns.length > 0 && (
                    <span className="block text-xs text-muted-foreground">+ {i.addOns.join(", ")}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
