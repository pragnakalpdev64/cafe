"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  unitPrice: number;
  addOnIds: string[];
  addOnNames: string[];
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

const lineKey = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

// Prices here are for display only; the server recalculates every total from the database.
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((state) => {
          const key = lineKey(line.itemId, line.addOnIds);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key }] };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        })),
      clear: () => set({ lines: [] }),
    }),
    // Rehydrated in an effect (see CartHydrator) so server and first client render match.
    // bump `version` when menu ids change so stale carts are dropped
    { name: "hh-cart", version: 1, skipHydration: true, migrate: () => ({ lines: [] }) as unknown as CartState },
  ),
);

export function cartTotals(lines: CartLine[]) {
  return lines.reduce(
    (acc, l) => ({ count: acc.count + l.quantity, total: acc.total + l.unitPrice * l.quantity }),
    { count: 0, total: 0 },
  );
}
