"use client";

import { ChevronLeft, CircleCheck, ClipboardList, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { lookupCustomerName, placeOrder } from "@/app/order-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { type GuestSpot, itemCount, useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { INDIAN_MOBILE } from "@/lib/validators/phone";
import { QuantityStepper } from "./quantity-stepper";

export type TableOption = { slug: string; label: string };

type Step = { kind: "list" } | { kind: "details" } | { kind: "sent"; number: number };

/**
 * The guest's list and checkout. `fixedTable` comes from a table QR (/t/…);
 * on /menu the guest picks a table or takeaway. Customers never see a total.
 */
export function CartBar({ tables, fixedTable }: { tables: TableOption[]; fixedTable?: TableOption }) {
  const lines = useCart((s) => s.lines);
  const spot = useCart((s) => s.spot);
  const setQuantity = useCart((s) => s.setQuantity);
  const setSpot = useCart((s) => s.setSpot);
  const clear = useCart((s) => s.clear);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "list" });
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

  const openSheet = () => {
    setStep({ kind: "list" });
    setOpen(true);
  };

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
              onClick={openSheet}
              className="mx-auto flex h-16 w-full max-w-xl items-center gap-3 rounded-full bg-hh-green-deep pr-2 pl-5 text-left text-white shadow-[0_20px_40px_-12px_rgba(15,92,44,0.6)] ring-1 ring-white/10"
            >
              <motion.span key={count} initial={{ scale: 1.35 }} animate={{ scale: 1 }} className="relative">
                <ClipboardList className="size-6" aria-hidden />
                <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-hh-orange tabular text-[11px] font-bold text-hh-ink">
                  {count}
                </span>
              </motion.span>
              <span className="flex-1">
                <span className="block text-base leading-tight font-semibold">Your list</span>
                <span className="block text-xs text-white/80">
                  {count} item{count === 1 ? "" : "s"}
                  {spot?.kind === "table"
                    ? ` · Table ${spot.label}`
                    : spot?.kind === "takeaway"
                      ? " · Takeaway"
                      : ""}
                </span>
              </span>
              <span className="rounded-full bg-cta px-5 py-3 text-sm font-bold text-cta-foreground">
                View list
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[88svh] max-w-xl gap-0 overflow-y-auto rounded-t-[2rem] border-x p-0 sm:bottom-4 sm:rounded-[2rem] sm:border"
        >
          {step.kind === "list" && (
            <>
              <div className="px-5 pt-6 pb-2">
                <SheetTitle className="font-heading text-2xl font-bold">Your list</SheetTitle>
                <SheetDescription>Check your items, then confirm. Pay at the counter.</SheetDescription>
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
                    <QuantityStepper
                      value={l.quantity}
                      min={0}
                      onChange={(q) => setQuantity(l.key, q)}
                      label={`Quantity of ${l.name}`}
                    />
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-0 mt-2 flex items-center gap-3 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
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
                  disabled={!spot || count === 0}
                  onClick={() => setStep({ kind: "details" })}
                >
                  {spot ? "Confirm order" : "Choose table or takeaway"}
                </Button>
              </div>
            </>
          )}

          {step.kind === "details" && spot && (
            <DetailsStep
              spot={spot}
              onBack={() => setStep({ kind: "list" })}
              onSent={(number) => setStep({ kind: "sent", number })}
            />
          )}

          {step.kind === "sent" && (
            <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
              <CircleCheck className="size-14 text-hh-green dark:text-hh-green-light" aria-hidden />
              <SheetTitle className="mt-3 font-heading text-3xl font-bold">
                Order #{step.number} sent
              </SheetTitle>
              <SheetDescription className="mt-2 max-w-sm text-base">
                Staff will confirm it shortly. You pay at the counter when you&apos;re done.
              </SheetDescription>
              <Button className="mt-6 h-11 rounded-full px-8" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetailsStep({
  spot,
  onBack,
  onSent,
}: {
  spot: GuestSpot;
  onBack: () => void;
  onSent: (number: number) => void;
}) {
  const lines = useCart((s) => s.lines);
  const saved = useCart((s) => s.guest);
  const orderPlaced = useCart((s) => s.orderPlaced);
  const [name, setName] = useState(saved?.name ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(saved?.marketingConsent ?? false);
  const [error, setError] = useState<{ message: string; problems?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const phoneOk = INDIAN_MOBILE.test(phone);

  // Returning customers: fill in their name once a full number is typed.
  useEffect(() => {
    if (!phoneOk || name) return;
    let cancelled = false;
    void lookupCustomerName(phone).then((res) => {
      if (!cancelled && res.name) setName((current) => current || res.name!);
    });
    return () => {
      cancelled = true;
    };
  }, [phone, phoneOk, name]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await placeOrder({
          ...(spot.kind === "table" ? { tableSlug: spot.slug } : { takeaway: true }),
          name,
          phone,
          note: note || undefined,
          marketingConsent: consent,
          items: lines.map((l) => ({ itemId: l.itemId, addOnIds: l.addOnIds, quantity: l.quantity })),
        });
        if (res.ok) {
          orderPlaced({ id: res.orderId, number: res.number }, { name, phone, marketingConsent: consent });
          onSent(res.number);
        } else {
          setError({ message: res.error, problems: res.problems });
        }
      } catch {
        setError({ message: "Couldn't reach the café. Check your internet and try again." });
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col">
      <div className="px-5 pt-5 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden /> Your list
        </button>
        <SheetTitle className="mt-2 font-heading text-2xl font-bold">Your details</SheetTitle>
        <SheetDescription>
          {spot.kind === "table" ? `For Table ${spot.label}. ` : "Takeaway. "}
          We use your number to manage this order and contact you about it.
        </SheetDescription>
      </div>

      <div className="space-y-4 px-5 py-3">
        <div className="space-y-1.5">
          <Label htmlFor="guest-phone">Mobile number</Label>
          <Input
            id="guest-phone"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder="98xxxxxx21"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            aria-invalid={phone.length === 10 && !phoneOk}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-name">Name</Label>
          <Input
            id="guest-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-note">Note to the kitchen (optional)</Label>
          <Textarea
            id="guest-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Less spicy, no onion…"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
          <span>
            Send me Healthy Hunger offers on WhatsApp or SMS.{" "}
            <span className="text-muted-foreground">(Optional)</span>
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          See our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy note
          </Link>
          .
        </p>

        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <p>{error.message}</p>
            {error.problems && (
              <ul className="mt-1 list-disc pl-5">
                {error.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-2 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
        <Button
          type="submit"
          disabled={pending || !phoneOk || name.trim().length < 2}
          className="h-12 w-full rounded-full bg-cta text-base font-bold text-cta-foreground hover:bg-hh-orange-light"
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          Send order
        </Button>
      </div>
    </form>
  );
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
  const mode = spot?.kind ?? "table";
  return (
    <fieldset className="space-y-3">
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
