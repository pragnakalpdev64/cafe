"use client";

import { BellRing, CircleCheck, ClipboardList, LoaderCircle, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setSelectionReady, syncSelection } from "@/app/selection-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { type GuestSpot, itemCount, useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

export type TableOption = { slug: string; label: string };

type Sync = "idle" | "saving" | "saved" | "error";

/**
 * The guest's list. Staff see it live while the guest picks; "Confirm" tells them the
 * guest is done, and the cashier then confirms the order at the table. No totals here.
 * `fixedTable` comes from a table QR (/t/…); on /menu the guest picks a table or takeaway.
 */
export function CartBar({ tables, fixedTable }: { tables: TableOption[]; fixedTable?: TableOption }) {
  const { clientId, lines, spot, ready, code, orders, showConfirmed } = useCart();
  const { setQuantity, setSpot, setReady, setCode, orderConfirmed, dismissConfirmed, clear } =
    useCart.getState();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [sync, setSync] = useState<Sync>("idle");
  const [readyPending, startReady] = useTransition();
  const count = itemCount(lines);
  const latest = orders[0];

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

  // Hear about the cashier confirming this list (also catches up after being offline).
  useEffect(() => {
    if (!hydrated) return;
    const source = new EventSource(`/api/guest/stream?cid=${clientId}`);
    source.addEventListener("confirmed", (e) => {
      const { orderId, number } = JSON.parse((e as MessageEvent).data) as { orderId: string; number: number };
      if (useCart.getState().orders.some((o) => o.id === orderId)) return;
      orderConfirmed({ id: orderId, number });
      shared.current = false;
      setOpen(true);
    });
    return () => source.close();
  }, [hydrated, clientId, orderConfirmed]);

  const markReady = (next: boolean) =>
    startReady(async () => {
      // make sure staff have the latest list before calling them
      const res = await setSelectionReady(clientId, next);
      if (res.ok) setReady(next);
      else toast.error(res.error ?? "Couldn't reach the café. Try again.");
    });

  const justConfirmed = showConfirmed && !!latest && count === 0;

  return (
    <>
      <AnimatePresence>
        {hydrated && (count > 0 || justConfirmed) && (
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
              ) : (
                <CircleCheck className="size-6" aria-hidden />
              )}
              <span className="flex-1">
                <span className="block text-base leading-tight font-semibold">
                  {count === 0
                    ? `Order #${latest?.number} confirmed`
                    : ready
                      ? "Staff are on the way"
                      : "Your list"}
                </span>
                <span className={cn("block text-xs", ready ? "text-hh-ink/75" : "text-white/80")}>
                  {count === 0
                    ? "Add more items any time"
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
          {justConfirmed ? (
            <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
              <CircleCheck className="size-14 text-hh-green dark:text-hh-green-light" aria-hidden />
              <SheetTitle className="mt-3 font-heading text-3xl font-bold">
                Order #{latest.number} confirmed
              </SheetTitle>
              <SheetDescription className="mt-2 max-w-sm text-base">
                Your food is being prepared. Pay at the counter when you&apos;re done. Want something else?
                Just add it to a new list.
              </SheetDescription>
              <Button
                className="mt-6 h-11 rounded-full px-8"
                onClick={() => {
                  dismissConfirmed();
                  setOpen(false);
                }}
              >
                Done
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
                  <li key={l.key} className="flex items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{l.name}</p>
                      {l.addOnNames.length > 0 && (
                        <p className="truncate text-xs text-muted-foreground">+ {l.addOnNames.join(", ")}</p>
                      )}
                    </div>
                    <QuantityStepper
                      value={l.quantity}
                      min={0}
                      onChange={(q) => setQuantity(l.key, q)}
                      label={`Quantity of ${l.name}`}
                    />
                  </li>
                ))}
              </ul>

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
