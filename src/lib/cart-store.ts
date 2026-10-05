"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// v1 has no ordering: this is the guest's list of picked items, shared with staff.

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  addOnIds: string[];
  addOnNames: string[];
  quantity: number;
};

/** Where staff should look for this guest: their table, or a phone number for takeaway. */
export type GuestSpot = { kind: "table"; slug: string; label: string } | { kind: "phone"; phone: string };

type CartState = {
  /** random id for this device, so each guest at a table has their own list */
  clientId: string;
  lines: CartLine[];
  spot: GuestSpot | null;
  /** last change, used to drop yesterday's list */
  touchedAt: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  setSpot: (spot: GuestSpot | null) => void;
  clear: () => void;
};

const LIST_TTL_MS = 12 * 60 * 60 * 1000;

const lineKey = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000000";

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      clientId: newClientId(),
      lines: [],
      spot: null,
      touchedAt: Date.now(),
      add: (line) =>
        set((state) => {
          const key = lineKey(line.itemId, line.addOnIds);
          const existing = state.lines.find((l) => l.key === key);
          const lines = existing
            ? state.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l))
            : [...state.lines, { ...line, key }];
          return { lines, touchedAt: Date.now() };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
          touchedAt: Date.now(),
        })),
      setSpot: (spot) => set({ spot, touchedAt: Date.now() }),
      clear: () => set({ lines: [], touchedAt: Date.now() }),
    }),
    {
      name: "hh-cart",
      // bump when the stored shape or menu ids change so stale lists are dropped
      version: 2,
      migrate: () => ({ clientId: newClientId(), lines: [], spot: null, touchedAt: Date.now() }) as unknown as CartState,
      // Rehydrated in an effect (see CartBar) so server and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state && Date.now() - state.touchedAt > LIST_TTL_MS) state.clear();
      },
    },
  ),
);

export const itemCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
