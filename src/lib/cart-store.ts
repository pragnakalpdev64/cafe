"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// The guest's list of picked items. Customers never see prices totalled here;
// the server prices the order when they tap "Confirm order".

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  addOnIds: string[];
  addOnNames: string[];
  quantity: number;
};

/** Where the order goes: a table (from its QR or picked on /menu) or takeaway. */
export type GuestSpot = { kind: "table"; slug: string; label: string } | { kind: "takeaway" };

/** Remembered on this phone so the next order is quicker. */
export type GuestDetails = { name: string; phone: string; marketingConsent: boolean };

export type PlacedOrder = { id: string; number: number; placedAt: number };

type CartState = {
  lines: CartLine[];
  spot: GuestSpot | null;
  guest: GuestDetails | null;
  /** most recent first, for the order status page */
  orders: PlacedOrder[];
  /** last change, used to drop yesterday's list */
  touchedAt: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  setSpot: (spot: GuestSpot | null) => void;
  orderPlaced: (order: Omit<PlacedOrder, "placedAt">, guest: GuestDetails) => void;
  clear: () => void;
};

const LIST_TTL_MS = 12 * 60 * 60 * 1000;
const KEEP_ORDERS_MS = 24 * 60 * 60 * 1000;

const lineKey = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      spot: null,
      guest: null,
      orders: [],
      touchedAt: Date.now(),
      add: (line) =>
        set((state) => {
          const key = lineKey(line.itemId, line.addOnIds);
          const existing = state.lines.find((l) => l.key === key);
          const lines = existing
            ? state.lines.map((l) =>
                l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l,
              )
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
      orderPlaced: (order, guest) =>
        set((state) => ({
          lines: [],
          guest,
          orders: [{ ...order, placedAt: Date.now() }, ...state.orders].slice(0, 10),
          touchedAt: Date.now(),
        })),
      clear: () => set({ lines: [], touchedAt: Date.now() }),
    }),
    {
      name: "hh-cart",
      // bump when the stored shape or menu ids change so stale lists are dropped
      version: 3,
      migrate: () =>
        ({ lines: [], spot: null, guest: null, orders: [], touchedAt: Date.now() }) as unknown as CartState,
      // Rehydrated in an effect (see CartBar) so server and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (Date.now() - state.touchedAt > LIST_TTL_MS) state.clear();
        useCart.setState({ orders: state.orders.filter((o) => Date.now() - o.placedAt < KEEP_ORDERS_MS) });
      },
    },
  ),
);

export const itemCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
