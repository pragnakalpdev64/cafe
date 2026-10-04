import { CupSoda, Salad, Sandwich, Soup, Wheat } from "lucide-react";
import Image from "next/image";
import type { CategorySlug } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

const art: Record<string, { icon: typeof Soup; from: string; to: string }> = {
  salads: { icon: Salad, from: "#22c55e", to: "#0f5c2c" },
  chaat: { icon: Soup, from: "#ffa933", to: "#ff8a00" },
  sandwiches: { icon: Sandwich, from: "#ffc870", to: "#f59e0b" },
  toast: { icon: Wheat, from: "#ffb347", to: "#ea580c" },
  "oats-bowls": { icon: Soup, from: "#86efac", to: "#16a34a" },
  drinks: { icon: CupSoda, from: "#4ade80", to: "#15803d" },
};

const FALLBACK = { icon: Salad, from: "#86efac", to: "#15803d" };

/** Stand-in artwork until the owner uploads photos (photos are optional per item). */
export function ItemArt({ category, className }: { category: CategorySlug; className?: string }) {
  const a = art[category] ?? FALLBACK;
  return (
    <div
      aria-hidden
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(140deg, ${a.from}, ${a.to})` }}
    >
      <div className="absolute -top-1/3 -right-1/4 size-[90%] rounded-full bg-white/15 blur-xl" />
      <a.icon className="relative size-1/2 max-h-16 max-w-16 text-white/90 drop-shadow-md" strokeWidth={1.5} />
    </div>
  );
}

/** Uploaded photo if there is one, otherwise the category artwork. */
export function ItemImage({
  item,
  className,
  sizes,
  priority,
}: {
  item: { name: string; category: CategorySlug; photo?: string };
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!item.photo) return <ItemArt category={item.category} className={className} />;
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image src={item.photo} alt={item.name} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}
