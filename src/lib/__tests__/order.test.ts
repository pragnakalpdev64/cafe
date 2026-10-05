import { describe, expect, it } from "vitest";

import { PlaceOrderSchema } from "@/lib/validators/order";

const base = {
  name: "Priya",
  phone: "9876543210",
  items: [{ itemId: "salad", quantity: 2 }],
};

describe("PlaceOrderSchema", () => {
  it("accepts a table order and defaults add-ons and consent", () => {
    const parsed = PlaceOrderSchema.parse({ ...base, tableSlug: "t1" });
    expect(parsed.items[0].addOnIds).toEqual([]);
    expect(parsed.marketingConsent).toBe(false);
  });

  it("accepts takeaway", () => {
    expect(PlaceOrderSchema.safeParse({ ...base, takeaway: true }).success).toBe(true);
  });

  it("needs exactly one of table or takeaway", () => {
    expect(PlaceOrderSchema.safeParse(base).success).toBe(false);
    expect(PlaceOrderSchema.safeParse({ ...base, tableSlug: "t1", takeaway: true }).success).toBe(false);
  });

  it("normalises +91 and spaces in the phone number", () => {
    expect(PlaceOrderSchema.parse({ ...base, tableSlug: "t1", phone: "+91 98765 43210" }).phone).toBe(
      "9876543210",
    );
  });

  it("rejects non-Indian mobile numbers and short names", () => {
    expect(PlaceOrderSchema.safeParse({ ...base, tableSlug: "t1", phone: "1234567890" }).success).toBe(false);
    expect(PlaceOrderSchema.safeParse({ ...base, tableSlug: "t1", name: "P" }).success).toBe(false);
  });

  it("rejects empty orders and quantities over 20", () => {
    expect(PlaceOrderSchema.safeParse({ ...base, tableSlug: "t1", items: [] }).success).toBe(false);
    const items = [{ itemId: "salad", quantity: 21 }];
    expect(PlaceOrderSchema.safeParse({ ...base, tableSlug: "t1", items }).success).toBe(false);
  });
});
