"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// The guest's list of picked items, mirrored live to the dashboard. Customers never
// see a total; prices are set on the server when the guest places the order.

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  addOnIds: string[];
  addOnNames: string[];
  quantity: number;
};

export type OrderKind = "DINE_IN" | "PARCEL";

/** Remembered on this device so a returning guest doesn't type them again. */
export type GuestDetails = { name: string; phone: string };

export type PlacedOrder = { id: string; number: number; placedAt: number };

type CartState = {
  /** random id for this device: its live selection on the dashboard */
  clientId: string;
  lines: CartLine[];
  kind: OrderKind | null;
  guest: GuestDetails | null;
  /** most recent first, for the order status page */
  orders: PlacedOrder[];
  /** show "Order #N placed" until the guest taps Done or starts a new list */
  showConfirmed: boolean;
  /** last change, used to drop yesterday's list */
  touchedAt: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  /** change the add-ons on a line already in the list (merges with an identical line) */
  setAddOns: (key: string, addOnIds: string[], addOnNames: string[]) => void;
  setKind: (kind: OrderKind) => void;
  /** this device's list became an order */
  orderPlaced: (order: Omit<PlacedOrder, "placedAt">, guest?: GuestDetails) => void;
  dismissConfirmed: () => void;
  clear: () => void;
};

const LIST_TTL_MS = 12 * 60 * 60 * 1000;
const KEEP_ORDERS_MS = 24 * 60 * 60 * 1000;

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-000000000000";

export const lineKey = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      clientId: newClientId(),
      lines: [],
      kind: null,
      guest: null,
      orders: [],
      showConfirmed: false,
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
          return { lines, showConfirmed: false, touchedAt: Date.now() };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
          touchedAt: Date.now(),
        })),
      setAddOns: (key, addOnIds, addOnNames) =>
        set((state) => {
          const line = state.lines.find((l) => l.key === key);
          if (!line) return {};
          const nextKey = lineKey(line.itemId, addOnIds);
          if (nextKey === key) return {};
          const twin = state.lines.find((l) => l.key === nextKey);
          const lines = twin
            ? state.lines
                .filter((l) => l.key !== key)
                .map((l) =>
                  l.key === nextKey ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l,
                )
            : state.lines.map((l) => (l.key === key ? { ...l, key: nextKey, addOnIds, addOnNames } : l));
          return { lines, touchedAt: Date.now() };
        }),
      setKind: (kind) => set({ kind, touchedAt: Date.now() }),
      orderPlaced: (order, guest) =>
        set((state) =>
          state.orders.some((o) => o.id === order.id)
            ? { guest: guest ?? state.guest } // the live event may have recorded the order first
            : {
                lines: [],
                guest: guest ?? state.guest,
                showConfirmed: true,
                orders: [{ ...order, placedAt: Date.now() }, ...state.orders].slice(0, 10),
                touchedAt: Date.now(),
              },
        ),
      dismissConfirmed: () => set({ showConfirmed: false }),
      clear: () => set({ lines: [], touchedAt: Date.now() }),
    }),
    {
      name: "hh-cart",
      // bump when the stored shape or menu ids change so stale lists are dropped
      version: 5,
      migrate: () =>
        ({
          clientId: newClientId(),
          lines: [],
          kind: null,
          guest: null,
          orders: [],
          showConfirmed: false,
          touchedAt: Date.now(),
        }) as unknown as CartState,
      // Rehydrated in an effect (see CartBar) so server and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (Date.now() - state.touchedAt > LIST_TTL_MS) state.clear();
        const orders = state.orders.filter((o) => Date.now() - o.placedAt < KEEP_ORDERS_MS);
        // the confirmation banner is only useful during the visit
        const recent = orders[0] && Date.now() - orders[0].placedAt < 3 * 60 * 60 * 1000;
        useCart.setState({ orders, showConfirmed: state.showConfirmed && !!recent });
      },
    },
  ),
);

export const itemCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
