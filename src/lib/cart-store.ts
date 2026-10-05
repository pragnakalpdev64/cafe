"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// The guest's list of picked items, mirrored live to the dashboard. Customers never
// see a total; the cashier confirms the order (and its prices) at the table.

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

export type PlacedOrder = { id: string; number: number; placedAt: number };

type CartState = {
  /** random id for this device: its live selection on the dashboard */
  clientId: string;
  lines: CartLine[];
  spot: GuestSpot | null;
  /** guest tapped Confirm ("I'm done") and is waiting for the cashier */
  ready: boolean;
  /** 4-digit code a takeaway guest shows at the counter */
  code: number | null;
  /** most recent first, for the order status page */
  orders: PlacedOrder[];
  /** show "Order #N confirmed" until the guest taps Done or starts a new list */
  showConfirmed: boolean;
  /** last change, used to drop yesterday's list */
  touchedAt: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  setSpot: (spot: GuestSpot | null) => void;
  setReady: (ready: boolean) => void;
  setCode: (code: number) => void;
  /** the cashier confirmed this device's list as an order */
  orderConfirmed: (order: Omit<PlacedOrder, "placedAt">) => void;
  dismissConfirmed: () => void;
  clear: () => void;
};

const LIST_TTL_MS = 12 * 60 * 60 * 1000;
const KEEP_ORDERS_MS = 24 * 60 * 60 * 1000;

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-000000000000";

const lineKey = (itemId: string, addOnIds: string[]) => [itemId, ...[...addOnIds].sort()].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      clientId: newClientId(),
      lines: [],
      spot: null,
      ready: false,
      code: null,
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
      setSpot: (spot) => set({ spot, touchedAt: Date.now() }),
      setReady: (ready) => set({ ready, touchedAt: Date.now() }),
      setCode: (code) => set({ code }),
      orderConfirmed: (order) =>
        set((state) =>
          state.orders.some((o) => o.id === order.id)
            ? {}
            : {
                lines: [],
                ready: false,
                showConfirmed: true,
                orders: [{ ...order, placedAt: Date.now() }, ...state.orders].slice(0, 10),
                touchedAt: Date.now(),
              },
        ),
      dismissConfirmed: () => set({ showConfirmed: false }),
      clear: () => set({ lines: [], ready: false, touchedAt: Date.now() }),
    }),
    {
      name: "hh-cart",
      // bump when the stored shape or menu ids change so stale lists are dropped
      version: 4,
      migrate: () =>
        ({
          clientId: newClientId(),
          lines: [],
          spot: null,
          ready: false,
          code: null,
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
