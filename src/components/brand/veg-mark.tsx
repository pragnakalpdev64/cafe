import { cn } from "@/lib/utils";

/** The standard Indian vegetarian symbol: green square outline with a green dot. */
export function VegMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Vegetarian"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-veg bg-white",
        className,
      )}
    >
      <span className="size-2 rounded-full bg-veg" />
    </span>
  );
}
