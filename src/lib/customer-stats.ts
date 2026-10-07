// What a guest orders most, from their order lines. Pure, so it's unit-tested.

export type FavouriteSource = { itemName: string; quantity: number; status: string };

/** Dishes by total quantity across the guest's orders (cancelled ones ignored), most first. */
export function favouriteItems(lines: FavouriteSource[], limit = 5) {
  const counts = new Map<string, number>();
  for (const l of lines) {
    if (l.status === "CANCELLED") continue;
    counts.set(l.itemName, (counts.get(l.itemName) ?? 0) + l.quantity);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, quantity]) => ({ name, quantity }));
}
