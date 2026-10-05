import { describe, expect, it } from "vitest";

import { billTotals, type MenuItemPrice, priceLines } from "@/lib/pricing";

const menu = new Map<string, MenuItemPrice>([
  [
    "salad",
    {
      name: "Chatpata Salad",
      pricePaise: 24900,
      available: true,
      addOns: new Map([
        ["paneer", { name: "Extra paneer", pricePaise: 5000, available: true }],
        ["avocado", { name: "Avocado", pricePaise: 8000, available: false }],
      ]),
    },
  ],
  ["tea", { name: "Lemon Iced Tea", pricePaise: 9900, available: true, addOns: new Map() }],
  ["toast", { name: "Avocado Toast", pricePaise: 22900, available: false, addOns: new Map() }],
]);

describe("priceLines", () => {
  it("prices items with add-ons from the menu", () => {
    const res = priceLines(
      [
        { itemId: "salad", addOnIds: ["paneer"], quantity: 2 },
        { itemId: "tea", addOnIds: [], quantity: 1 },
      ],
      menu,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.lines[0]).toMatchObject({
      itemName: "Chatpata Salad",
      unitPricePaise: 29900,
      lineTotalPaise: 59800,
    });
    expect(res.lines[0].addOns).toEqual([{ id: "paneer", name: "Extra paneer", pricePaise: 5000 }]);
    expect(res.subtotalPaise).toBe(59800 + 9900);
  });

  it("counts a repeated add-on once", () => {
    const res = priceLines([{ itemId: "salad", addOnIds: ["paneer", "paneer"], quantity: 1 }], menu);
    expect(res.ok && res.subtotalPaise).toBe(29900);
  });

  it("rejects sold-out items and add-ons", () => {
    const res = priceLines(
      [
        { itemId: "toast", addOnIds: [], quantity: 1 },
        { itemId: "salad", addOnIds: ["avocado"], quantity: 1 },
      ],
      menu,
    );
    expect(res).toEqual({ ok: false, problems: ["Avocado Toast is sold out.", "Avocado is sold out."] });
  });

  it("rejects unknown items, add-ons the item doesn't offer and bad quantities", () => {
    expect(priceLines([{ itemId: "gone", addOnIds: [], quantity: 1 }], menu).ok).toBe(false);
    expect(priceLines([{ itemId: "tea", addOnIds: ["paneer"], quantity: 1 }], menu).ok).toBe(false);
    expect(priceLines([{ itemId: "tea", addOnIds: [], quantity: 0 }], menu).ok).toBe(false);
    expect(priceLines([{ itemId: "tea", addOnIds: [], quantity: 21 }], menu).ok).toBe(false);
    expect(priceLines([{ itemId: "tea", addOnIds: [], quantity: 1.5 }], menu).ok).toBe(false);
  });

  it("rejects an empty order", () => {
    expect(priceLines([], menu)).toEqual({ ok: false, problems: ["Your list is empty."] });
  });
});

describe("billTotals", () => {
  it("adds no tax when the rate is 0", () => {
    expect(billTotals(69700, 0)).toEqual({
      subtotalPaise: 69700,
      taxBasisPoints: 0,
      taxPaise: 0,
      totalPaise: 69700,
    });
  });

  it("applies 5 % GST rounded to the paisa", () => {
    expect(billTotals(24900, 500)).toMatchObject({ taxPaise: 1245, totalPaise: 26145 });
    expect(billTotals(999, 500)).toMatchObject({ taxPaise: 50, totalPaise: 1049 });
  });
});
