"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cartTotals, useCart } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { QuantityStepper } from "./quantity-stepper";

export function CartBar() {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const { count, total } = cartTotals(lines);

  useEffect(() => {
    void Promise.resolve(useCart.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

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
              <motion.span
                key={count}
                initial={{ scale: 1.35 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <ShoppingBag className="size-6" aria-hidden />
                <span className="tabular absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-hh-orange text-[11px] font-bold text-hh-ink">
                  {count}
                </span>
              </motion.span>
              <span className="flex-1">
                <span className="block text-xs text-white/75">
                  {count} item{count > 1 ? "s" : ""}
                </span>
                <span className="tabular block text-lg leading-tight font-semibold">{formatINR(total)}</span>
              </span>
              <span className="rounded-full bg-cta px-5 py-3 text-sm font-bold text-cta-foreground">
                View cart
              </span>
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
            <SheetTitle className="font-heading text-2xl font-bold">Your order</SheetTitle>
            <SheetDescription>Payment at the counter – cash or UPI.</SheetDescription>
          </div>
          <ul className="divide-y divide-border px-5">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.name}</p>
                  {l.addOnNames.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">+ {l.addOnNames.join(", ")}</p>
                  )}
                  <p className="tabular mt-1 text-sm text-brand-text">{formatINR(l.unitPrice * l.quantity)}</p>
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
          <div className="sticky bottom-0 mt-2 border-t border-border bg-popover/95 px-5 py-4 backdrop-blur">
            <div className="tabular mb-3 flex justify-between text-lg font-semibold">
              <span className="font-sans">Total</span>
              <span>{formatINR(total)}</span>
            </div>
            <Button
              className="h-12 w-full rounded-full text-base"
              onClick={() => toast("Checkout arrives in Phase 2 – order form for dine-in and parcel.")}
            >
              Continue to details
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
