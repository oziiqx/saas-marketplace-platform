"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  productId: string;
  productName: string;
  productSlug: string;
  thumbnailUrl: string | null;
  sellerName: string;
  pricingTierId: string;
  pricingTierName: string;
  unitPriceCents: number;
  currency: string;
  interval: "ONE_TIME" | "MONTH" | "YEAR";
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeLine: (pricingTierId: string) => void;
  setQuantity: (pricingTierId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.pricingTierId === line.pricingTierId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.pricingTierId === line.pricingTierId
                  ? { ...l, quantity: Math.min(20, l.quantity + quantity) }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity }] };
        }),
      removeLine: (pricingTierId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.pricingTierId !== pricingTierId),
        })),
      setQuantity: (pricingTierId, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.pricingTierId === pricingTierId
              ? { ...l, quantity: Math.max(1, Math.min(20, quantity)) }
              : l,
          ),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "saas-marketplace-cart", version: 1 },
  ),
);

export function cartSubtotalCents(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
}

export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
