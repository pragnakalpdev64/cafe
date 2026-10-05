"use client";

import { Check, ClipboardList, LoaderCircle, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { syncSelection } from "@/app/selection-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { type GuestSpot, itemCount, useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { INDIAN_MOBILE } from "@/lib/validators/selection";
import { QuantityStepper } from "./quantity-stepper";

export type TableOption = { slug: string; label: string };

type SyncState = { kind: "idle" | "saving" | "saved" | "needs-spot" } | { kind: "error"; message: string };

/**
 * v1 has no ordering: the guest builds a list and staff see it on the dashboard.
 * `fixedTable` comes from a table QR (/t/…); on /menu the guest picks a table or gives a phone number.
 */
export function CartBar({ tables, fixedTable }: { tables: TableOption[]; fixedTable?: TableOption }) {
  const lines = useCart((s) => s.lines);
  const spot = useCart((s) => s.spot);
  const clientId = useCart((s) => s.clientId);
  const setQuantity = useCart((s) => s.setQuantity);
  const setSpot = useCart((s) => s.setSpot);
  const clear = useCart((s) => s.clear);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [sync, setSync] = useState<SyncState>({ kind: "idle" });
  const count = itemCount(lines);

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

  // Share the list with staff shortly after every change.
  const synced = useRef(false);
  useEffect(() => {
    if (!hydrated || !spot) return;
    if (count === 0 && !synced.current) return; // nothing shared yet, nothing to remove
    const timer = setTimeout(async () => {
      setSync({ kind: "saving" });
      try {
        const res = await syncSelection({
          clientId,
          ...(spot.kind === "table" ? { tableSlug: spot.slug } : { phone: spot.phone }),
          items: lines.map((l) => ({ itemId: l.itemId, addOnIds: l.addOnIds, quantity: l.quantity })),
        });
        synced.current = count > 0;
        setSync(res.ok ? { kind: "saved" } : { kind: "error", message: res.error });
      } catch {
        setSync({ kind: "error", message: "Couldn't reach the café. Check your internet." });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [hydrated, lines, spot, clientId, count]);

  // without a table or number there is nothing to share yet
  const status: SyncState = !spot ? { kind: count > 0 ? "needs-spot" : "idle" } : sync;

  return (
    <>
      <AnimatePresence>
        {hydrated && count > 0 && (
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
              className="mx-auto flex h-16 w-full max-w-xl items-center gap-3 rounded-full bg-hh-green-deep pr-2 pl-5 text-left text-white shadow-[0_20px_40px_-12px_rgba(15,92,44,0.6)] ring-1 ring-white/10"
            >
              <motion.span key={count} initial={{ scale: 1.35 }} animate={{ scale: 1 }} className="relative">
                <ClipboardList className="size-6" aria-hidden />
                <span className="tabular absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-hh-orange text-[11px] font-bold text-hh-ink">
                  {count}
                </span>
              </motion.span>
              <span className="flex-1">
                <span className="block text-base leading-tight font-semibold">Your list</span>
                <SyncLine sync={status} spot={spot} compact />
              </span>
              <span className="rounded-full bg-cta px-5 py-3 text-sm font-bold text-cta-foreground">View list</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85svh] max-w-xl gap-0 overflow-y-auto rounded-t-[2rem] border-x p-0 sm:bottom-4 sm:rounded-[2rem] sm:border"
        >
          <div className="px-5 pt-6 pb-2">
            <SheetTitle className="font-heading text-2xl font-bold">Your list</SheetTitle>
            <SheetDescription>Staff can see this list. Tell them when you&apos;re ready – pay at the counter.</SheetDescription>
          </div>

          <div className="px-5 py-3">
            {fixedTable ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
                Table {fixedTable.label}
              </p>
            ) : (
              <SpotPicker tables={tables} spot={spot} onChange={setSpot} />
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
                <QuantityStepper value={l.quantity} min={0} onChange={(q) => setQuantity(l.key, q)} label={`Quantity of ${l.name}`} />
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 mt-2 flex items-center gap-3 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
            <SyncLine sync={status} spot={spot} />
            <Button
              variant="ghost"
              className="ml-auto rounded-full text-muted-foreground"
              onClick={() => {
                clear();
                setOpen(false);
              }}
            >
              Clear list
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SyncLine({ sync, spot, compact }: { sync: SyncState; spot: GuestSpot | null; compact?: boolean }) {
  const where = spot?.kind === "table" ? `Table ${spot.label}` : spot ? "your number" : "";
  const base = cn("flex items-center gap-1.5", compact ? "text-xs text-white/80" : "text-sm");
  switch (sync.kind) {
    case "saving":
      return (
        <span className={base} role="status">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Sharing with staff…
        </span>
      );
    case "saved":
      return (
        <span className={cn(base, !compact && "text-hh-green dark:text-hh-green-light")} role="status">
          <Check className="size-3.5" aria-hidden /> Staff can see it{where && ` · ${where}`}
        </span>
      );
    case "needs-spot":
      return (
        <span className={cn(base, !compact && "text-brand-text")} role="status">
          <TriangleAlert className="size-3.5" aria-hidden /> {compact ? "Add your table so staff can see it" : "Pick your table or add your number"}
        </span>
      );
    case "error":
      return (
        <span className={cn(base, !compact && "text-destructive")} role="alert">
          <TriangleAlert className="size-3.5" aria-hidden /> {sync.message}
        </span>
      );
    default:
      return null;
  }
}

function SpotPicker({
  tables,
  spot,
  onChange,
}: {
  tables: TableOption[];
  spot: GuestSpot | null;
  onChange: (spot: GuestSpot | null) => void;
}) {
  const [mode, setMode] = useState<"table" | "phone">(spot?.kind ?? "table");
  const [phone, setPhone] = useState(spot?.kind === "phone" ? spot.phone : "");
  const phoneOk = INDIAN_MOBILE.test(phone);

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Where are you?</legend>
      <div className="inline-flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Where are you?">
        {(["table", "phone"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              mode === m ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {m === "table" ? "At a table" : "Takeaway"}
          </button>
        ))}
      </div>

      {mode === "table" ? (
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
      ) : (
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneOk) onChange({ kind: "phone", phone });
          }}
        >
          <Label htmlFor="guest-phone">Mobile number</Label>
          <div className="flex gap-2">
            <Input
              id="guest-phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="98xxxxxx21"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              aria-invalid={phone.length === 10 && !phoneOk}
              className="h-11"
            />
            <Button type="submit" disabled={!phoneOk} className="h-11 rounded-full px-5">
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Only used so staff can find your list. See our privacy note.</p>
        </form>
      )}
    </fieldset>
  );
}
