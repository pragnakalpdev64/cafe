import { cn } from "@/lib/utils";

type NutritionLabelProps = {
  protein: number;
  kcal: number;
  className?: string;
};

/** Small FDA-style label in the café palette. Values are approximate by design. */
export function NutritionLabel({ protein, kcal, className }: NutritionLabelProps) {
  return (
    <div className={cn("rounded-xl border-2 border-foreground/80 p-3 text-foreground", className)}>
      <p className="font-heading text-lg leading-none font-extrabold">Nutrition*</p>
      <div className="my-2 h-1.5 bg-foreground/80" />
      <dl className="tabular space-y-1 text-sm">
        <div className="flex justify-between border-b border-foreground/30 pb-1">
          <dt className="font-sans font-semibold">Protein</dt>
          <dd>{protein} g</dd>
        </div>
        <div className="flex justify-between">
          <dt className="font-sans font-semibold">Energy</dt>
          <dd>{kcal} kcal</dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] leading-tight text-muted-foreground">*Approximate values.</p>
    </div>
  );
}
