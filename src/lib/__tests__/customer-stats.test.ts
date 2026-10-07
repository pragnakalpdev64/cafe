import { describe, expect, it } from "vitest";

import { favouriteItems } from "@/lib/customer-stats";

describe("favouriteItems", () => {
  it("adds up quantities across orders and ignores cancelled ones", () => {
    expect(
      favouriteItems([
        { itemName: "Chole Bowl", quantity: 1, status: "PAID" },
        { itemName: "Green Tea", quantity: 2, status: "PAID" },
        { itemName: "Chole Bowl", quantity: 2, status: "SERVED" },
        { itemName: "Rajma Tikki", quantity: 5, status: "CANCELLED" },
      ]),
    ).toEqual([
      { name: "Chole Bowl", quantity: 3 },
      { name: "Green Tea", quantity: 2 },
    ]);
  });

  it("breaks ties by name and respects the limit", () => {
    const lines = ["B", "A", "C"].map((itemName) => ({ itemName, quantity: 1, status: "PAID" }));
    expect(favouriteItems(lines, 2).map((f) => f.name)).toEqual(["A", "B"]);
  });
});
