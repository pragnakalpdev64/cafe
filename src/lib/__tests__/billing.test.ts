import { describe, expect, it } from "vitest";

import { billFromOrders, mergeBillLines } from "@/lib/billing";

describe("mergeBillLines", () => {
  it("merges the same dish across rounds and keeps different add-ons apart", () => {
    const lines = mergeBillLines([
      { itemName: "Salad", unitPricePaise: 29900, quantity: 1, addOns: [{ name: "Extra paneer" }] },
      { itemName: "Tea", unitPricePaise: 9900, quantity: 1, addOns: [] },
      { itemName: "Tea", unitPricePaise: 9900, quantity: 2, addOns: [] },
      { itemName: "Salad", unitPricePaise: 24900, quantity: 1, addOns: [] },
    ]);
    expect(lines).toEqual([
      { name: "Salad", addOns: ["Extra paneer"], unitPricePaise: 29900, quantity: 1, amountPaise: 29900 },
      { name: "Tea", addOns: [], unitPricePaise: 9900, quantity: 3, amountPaise: 29700 },
      { name: "Salad", addOns: [], unitPricePaise: 24900, quantity: 1, amountPaise: 24900 },
    ]);
  });

  it("keeps a price change between rounds as a separate line", () => {
    const lines = mergeBillLines([
      { itemName: "Tea", unitPricePaise: 9900, quantity: 1, addOns: [] },
      { itemName: "Tea", unitPricePaise: 10900, quantity: 1, addOns: [] },
    ]);
    expect(lines).toHaveLength(2);
  });
});

describe("billFromOrders", () => {
  it("adds up rounds and applies tax once on the total", () => {
    expect(billFromOrders([{ subtotalPaise: 39700 }, { subtotalPaise: 40700 }], 0)).toEqual({
      subtotalPaise: 80400,
      taxBasisPoints: 0,
      taxPaise: 0,
      totalPaise: 80400,
    });
    expect(billFromOrders([{ subtotalPaise: 999 }, { subtotalPaise: 999 }], 500)).toMatchObject({
      taxPaise: 100,
      totalPaise: 2098,
    });
  });
});
