import { describe, expect, it } from "vitest";

import { PlaceOrderSchema } from "@/lib/validators/place-order";
import { GuestSelectionSchema } from "@/lib/validators/selection";

const id = "6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60";
const items = [{ itemId: "salad", quantity: 2 }];

describe("GuestSelectionSchema", () => {
  it("accepts a dine-in or takeaway list and defaults add-ons", () => {
    expect(GuestSelectionSchema.parse({ clientId: id, takeaway: false, items }).items[0].addOnIds).toEqual(
      [],
    );
    expect(GuestSelectionSchema.safeParse({ clientId: id, takeaway: true, items: [] }).success).toBe(true);
  });

  it("needs dine-in or takeaway", () => {
    expect(GuestSelectionSchema.safeParse({ clientId: id, items }).success).toBe(false);
  });

  it("caps quantity at 20", () => {
    expect(
      GuestSelectionSchema.safeParse({
        clientId: id,
        takeaway: false,
        items: [{ itemId: "x", quantity: 21 }],
      }).success,
    ).toBe(false);
  });
});

describe("PlaceOrderSchema", () => {
  const base = { clientId: id, takeaway: false, name: "Priya", phone: "9876543210", items };

  it("normalises +91 and spaces in the phone number", () => {
    expect(PlaceOrderSchema.parse({ ...base, phone: "+91 98765 43210" }).phone).toBe("9876543210");
  });

  it("rejects bad phones, short names and empty orders", () => {
    expect(PlaceOrderSchema.safeParse({ ...base, phone: "1234567890" }).success).toBe(false);
    expect(PlaceOrderSchema.safeParse({ ...base, name: "P" }).success).toBe(false);
    expect(PlaceOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
});
