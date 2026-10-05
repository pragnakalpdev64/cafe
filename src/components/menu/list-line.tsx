"use client";

import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { CartLine } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import type { AddOn } from "@/lib/menu-types";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "./quantity-stepper";

/** One line in the guest's list: quantity, and the dish's add-ons can be changed in place. */
export function ListLine({
  line,
  options,
  open,
  onToggle,
  onQuantity,
  onAddOns,
}: {
  line: CartLine;
  /** add-ons this dish offers */
  options: AddOn[];
  /** kept by the list, so the panel stays open while the line's add-ons (and key) change */
  open: boolean;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
  onAddOns: (ids: string[], names: string[]) => void;
}) {
  const panelId = `addons-${line.itemId}`;

  const toggle = (addOn: AddOn, on: boolean) => {
    const ids = on ? [...line.addOnIds, addOn.id] : line.addOnIds.filter((id) => id !== addOn.id);
    // keep the menu's order so the list reads the same as the item sheet
    const picked = options.filter((o) => ids.includes(o.id));
    onAddOns(
      picked.map((o) => o.id),
      picked.map((o) => o.name),
    );
  };

  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{line.name}</p>
          {line.addOnNames.length > 0 && (
            <p className="text-xs text-muted-foreground">+ {line.addOnNames.join(", ")}</p>
          )}
          {options.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={onToggle}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-hh-green dark:text-hh-green-light"
            >
              {line.addOnIds.length > 0 ? "Change add-ons" : "Add add-ons"}
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
        <QuantityStepper
          value={line.quantity}
          min={0}
          onChange={onQuantity}
          label={`Quantity of ${line.name}`}
        />
      </div>

      {open && (
        <fieldset id={panelId} className="mt-3 rounded-2xl border border-border">
          <legend className="sr-only">Add-ons for {line.name}</legend>
          {options.map((a) => {
            const id = `${panelId}-${a.id}`;
            const checked = line.addOnIds.includes(a.id);
            return (
              <label
                key={a.id}
                htmlFor={id}
                className={cn(
                  "flex min-h-11 items-center gap-3 border-b border-border px-3 last:border-0",
                  a.available || checked ? "cursor-pointer" : "opacity-50",
                )}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  // a sold-out add-on can still be removed, just not added
                  disabled={!a.available && !checked}
                  onCheckedChange={(c) => toggle(a, c === true)}
                />
                <span className="flex-1 text-sm">
                  {a.name}
                  <span className="block tabular text-xs text-muted-foreground">
                    {a.available ? `+${a.protein} g protein · ${a.kcal} kcal` : "Sold out"}
                  </span>
                </span>
                <span className="tabular text-sm">+{formatINR(a.price)}</span>
              </label>
            );
          })}
        </fieldset>
      )}
    </li>
  );
}
