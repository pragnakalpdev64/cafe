"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
};

export function QuantityStepper({ value, onChange, min = 1, max = 20, label, className }: Props) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex h-11 items-center rounded-full border border-border bg-background", className)}
    >
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <span className="tabular w-6 text-center font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full disabled:opacity-40"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
