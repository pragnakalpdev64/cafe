"use client";

import { BellRing, ChefHat, CircleCheck, ClipboardList, LoaderCircle, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { type GuestOrder, getGuestOrders, setSelectionReady, syncSelection } from "@/app/selection-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { type GuestSpot, itemCount, lineKey, useCart } from "@/lib/cart-store";
import type { AddOn, MenuItem } from "@/lib/menu-types";
import { cn } from "@/lib/utils";
import { guestStatusLabel, isActive, OrderTracker } from "./order-tracker";
import { ListLine } from "./list-line";

export type TableOption = { slug: string; label: string };

type Sync = "idle" | "saving" | "saved" | "error";

/**
 * The guest's list. Staff see it live while the guest picks; "Confirm" tells them the
 * guest is done, and the cashier then confirms the order at the table. No totals here.
 * `fixedTable` comes from a table QR (/t/…); on /menu the guest picks a table or takeaway.
 */
export function CartBar({
  tables,
  fixedTable,
  items,
  addOns,
}: {
  tables: TableOption[];
  fixedTable?: TableOption;
  /** menu items and add-ons, so guests can change add-ons from the list */
  items: MenuItem[];
  addOns: AddOn[];
}) {
  const { clientId, lines, spot, ready, code, orders, showConfirmed } = useCart();
  const { setQuantity, setAddOns, setSpot, setReady, setCode, orderConfirmed, dismissConfirmed, clear } =
    useCart.getState();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [sync, setSync] = useState<Sync>("idle");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [readyPending, startReady] = useTransition();
  const [guestOrders, setGuestOrders] = useState<GuestOrder[]>([]);
  const count = itemCount(lines);
  const addOnsFor = useCallback(
    (itemId: string) => {
      const ids = items.find((i) => i.id === itemId)?.addOnIds ?? [];
      return addOns.filter((a) => ids.includes(a.id));
    },
    [items, addOns],
  );
  const latest = orders[0];
  const orderIds = orders.map((o) => o.id).join(",");

  const loadOrders = useCallback(async (ids: string) => {
    setGuestOrders(ids ? await getGuestOrders(ids.split(",")) : []);
  }, []);

  useEffect(() => {
    void Promise.resolve(useCart.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  // A table QR always wins over whatever the guest picked before.
  useEffect(() => {
    if (!hydrated || !fixedTable) return;
    const current = useCart.getState().spot;
    if (current?.kind !== "table" || current.slug !== fixedTable.slug) {
      setSpot({ kind: "table", slug: fixedTable.slug, label: fixedTable.label });
    }
  }, [hydrated, fixedTable, setSpot]);

  // Mirror the list to the dashboard shortly after every change.
  const shared = useRef(false);
  useEffect(() => {
    if (!hydrated || !spot) return;
    if (count === 0 && !shared.current) return; // nothing shared yet, nothing to remove
    const timer = setTimeout(async () => {
      setSync("saving");
      try {
        const res = await syncSelection({
          clientId,
          ...(spot.kind === "table" ? { tableSlug: spot.slug } : { takeaway: true }),
          items: lines.map((l) => ({ itemId: l.itemId, addOnIds: l.addOnIds, quantity: l.quantity })),
        });
        shared.current = count > 0;
        if (res.ok) {
          if (res.code) setCode(res.code);
          setSync("saved");
        } else {
          setSync("error");
          toast.error(res.error);
        }
      } catch {
        setSync("error");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [hydrated, lines, spot, clientId, count, setCode]);

  // Live: the cashier confirming this list, and every status change of this guest's orders
  // (also catches up after being offline – the stream sends the current state on connect).
  useEffect(() => {
    if (!hydrated) return;
    const source = new EventSource(`/api/guest/stream?cid=${clientId}&orders=${orderIds}`);
    source.addEventListener("confirmed", (e) => {
      const { orderId, number } = JSON.parse((e as MessageEvent).data) as { orderId: string; number: number };
      if (useCart.getState().orders.some((o) => o.id === orderId)) return;
      orderConfirmed({ id: orderId, number });
      shared.current = false;
      setOpen(true);
    });
    source.addEventListener("order", () => void loadOrders(orderIds));
    source.onopen = () => void loadOrders(orderIds);
    return () => source.close();
  }, [hydrated, clientId, orderIds, orderConfirmed, loadOrders]);

  const markReady = (next: boolean) =>
    startReady(async () => {
      // make sure staff have the latest list before calling them
      const res = await setSelectionReady(clientId, next);
      if (res.ok) setReady(next);
      else toast.error(res.error ?? "Couldn't reach the café. Try again.");
    });

  const active = guestOrders.filter(isActive);
  // with an empty list, the bar and sheet show the guest's orders instead
  const tracking = count === 0 && (active.length > 0 || (showConfirmed && guestOrders.length > 0));
  const headline = active[0] ?? guestOrders[0];

  return (
    <>
      <AnimatePresence>
        {hydrated && (count > 0 || tracking) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "mx-auto flex h-16 w-full max-w-xl items-center gap-3 rounded-full pr-2 pl-5 text-left shadow-[0_20px_40px_-12px_rgba(15,92,44,0.6)] ring-1 ring-white/10",
                ready ? "bg-hh-orange text-hh-ink" : "bg-hh-green-deep text-white",
              )}
            >
              {count > 0 ? (
                <motion.span
                  key={count}
                  initial={{ scale: 1.35 }}
                  animate={{ scale: 1 }}
                  className="relative"
                >
                  {ready ? (
                    <BellRing className="size-6" aria-hidden />
                  ) : (
                    <ClipboardList className="size-6" aria-hidden />
                  )}
                  <span
                    className={cn(
                      "absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full tabular text-[11px] font-bold",
                      ready ? "bg-hh-ink text-white" : "bg-hh-orange text-hh-ink",
                    )}
                  >
                    {count}
                  </span>
                </motion.span>
              ) : headline?.status === "PREPARING" ? (
                <ChefHat className="size-6" aria-hidden />
              ) : (
                <CircleCheck className="size-6" aria-hidden />
              )}
              <span className="flex-1">
                <span className="block text-base leading-tight font-semibold">
                  {count === 0
                    ? `Order #${headline?.number ?? latest?.number} · ${headline ? guestStatusLabel(headline) : "Confirmed"}`
                    : ready
                      ? "Staff are on the way"
                      : "Your list"}
                </span>
                <span className={cn("block text-xs", ready ? "text-hh-ink/75" : "text-white/80")}>
                  {count === 0
                    ? "Tap to follow your order · add more any time"
                    : `${count} item${count === 1 ? "" : "s"}${spot?.kind === "table" ? ` · Table ${spot.label}` : spot?.kind === "takeaway" ? " · Takeaway" : ""}`}
                </span>
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-5 py-3 text-sm font-bold",
                    ready ? "bg-hh-ink text-white" : "bg-cta text-cta-foreground",
                  )}
                >
                  View list
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[88svh] max-w-xl gap-0 overflow-y-auto rounded-t-[2rem] border-x p-0 sm:bottom-4 sm:rounded-[2rem] sm:border"
        >
          {tracking ? (
            <div className="px-5 pt-6 pb-6">
              <SheetTitle className="font-heading text-2xl font-bold">Your orders</SheetTitle>
              <SheetDescription className="mb-4">
                Updates here as the kitchen works. Pay at the counter when you&apos;re done.
              </SheetDescription>
              <OrderTracker orders={guestOrders} />
              <Button
                className="mt-5 h-11 w-full rounded-full"
                onClick={() => {
                  dismissConfirmed();
                  setOpen(false);
                }}
              >
                Add more items
              </Button>
            </div>
          ) : (
            <>
              <div className="px-5 pt-6 pb-2">
                <SheetTitle className="font-heading text-2xl font-bold">Your list</SheetTitle>
                <SheetDescription>
                  {ready
                    ? "Staff have been called and can see your list. You can still change it."
                    : "Staff can see your list. Tap Confirm when you're done and someone will come to take your order."}
                </SheetDescription>
              </div>

              <div className="px-5 py-3">
                {fixedTable ? (
                  <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
                    Table {fixedTable.label}
                  </p>
                ) : (
                  <SpotPicker tables={tables} spot={spot} onChange={setSpot} disabled={ready} />
                )}
                {spot?.kind === "takeaway" && code && (
                  <p className="mt-3 rounded-2xl bg-accent px-4 py-3 text-sm">
                    Show this code at the counter:{" "}
                    <span className="ml-1 tabular text-2xl font-bold tracking-widest text-brand-text">
                      {code}
                    </span>
                  </p>
                )}
              </div>

              <ul className="divide-y divide-border px-5">
                {lines.map((l) => (
                  <ListLine
                    key={l.key}
                    line={l}
                    options={addOnsFor(l.itemId)}
                    open={expanded === l.key}
                    onToggle={() => setExpanded((k) => (k === l.key ? null : l.key))}
                    onQuantity={(q) => setQuantity(l.key, q)}
                    onAddOns={(ids, names) => {
                      setAddOns(l.key, ids, names);
                      setExpanded(lineKey(l.itemId, ids)); // follow the line to its new key
                    }}
                  />
                ))}
              </ul>

              {active.length > 0 && (
                <div className="px-5 pt-5">
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">Already ordered</p>
                  <OrderTracker orders={active} />
                </div>
              )}

              <div className="sticky bottom-0 mt-2 space-y-2 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
                <SyncLine sync={sync} hasSpot={!!spot} />
                {ready ? (
                  <div className="flex items-center gap-3">
                    <p className="flex flex-1 items-center gap-2 font-semibold text-brand-text">
                      <BellRing className="size-5" aria-hidden /> Staff are on the way
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={readyPending}
                      onClick={() => markReady(false)}
                    >
                      Not done yet
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      className="rounded-full text-muted-foreground"
                      onClick={() => {
                        clear();
                        setOpen(false);
                      }}
                    >
                      Clear list
                    </Button>
                    <Button
                      className="ml-auto h-12 flex-1 rounded-full bg-cta text-base font-bold text-cta-foreground hover:bg-hh-orange-light"
                      disabled={!spot || count === 0 || readyPending || sync === "saving"}
                      onClick={() => markReady(true)}
                    >
                      {readyPending && <LoaderCircle className="animate-spin" aria-hidden />}
                      {spot ? "Confirm – I'm done" : "Choose table or takeaway"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SyncLine({ sync, hasSpot }: { sync: Sync; hasSpot: boolean }) {
  if (!hasSpot) return null;
  if (sync === "error")
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
        <TriangleAlert className="size-3.5" aria-hidden /> Couldn&apos;t reach the café. Check your internet.
      </p>
    );
  if (sync === "saving")
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Updating…
      </p>
    );
  return null;
}

function SpotPicker({
  tables,
  spot,
  onChange,
  disabled,
}: {
  tables: TableOption[];
  spot: GuestSpot | null;
  onChange: (spot: GuestSpot | null) => void;
  disabled?: boolean;
}) {
  const mode = spot?.kind ?? "table";
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="sr-only">Where are you?</legend>
      <div className="inline-flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Where are you?">
        {(["table", "takeaway"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onChange(m === "takeaway" ? { kind: "takeaway" } : null)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              mode === m ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {m === "table" ? "At a table" : "Takeaway"}
          </button>
        ))}
      </div>
      {mode === "table" && (
        <div className="space-y-1.5">
          <Label htmlFor="guest-table">Your table</Label>
          <NativeSelect
            id="guest-table"
            className="h-11"
            value={spot?.kind === "table" ? spot.slug : ""}
            onChange={(e) => {
              const t = tables.find((x) => x.slug === e.target.value);
              onChange(t ? { kind: "table", slug: t.slug, label: t.label } : null);
            }}
          >
            <option value="">Choose your table</option>
            {tables.map((t) => (
              <option key={t.slug} value={t.slug}>
                Table {t.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </fieldset>
  );
}
