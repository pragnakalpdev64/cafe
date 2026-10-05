import { describe, expect, it } from "vitest";

import { SelectionSchema } from "@/lib/validators/selection";

const base = {
  clientId: "6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60",
  items: [{ itemId: "paneer-wrap", quantity: 2 }],
};

describe("SelectionSchema", () => {
  it("accepts a table pick and defaults add-ons", () => {
    const parsed = SelectionSchema.parse({ ...base, tableSlug: "t1" });
    expect(parsed.items[0].addOnIds).toEqual([]);
  });

  it("accepts a takeaway phone", () => {
    expect(SelectionSchema.safeParse({ ...base, phone: "9876543210" }).success).toBe(true);
  });

  it("needs a table or a phone", () => {
    expect(SelectionSchema.safeParse(base).success).toBe(false);
  });

  it("rejects non-Indian mobile numbers", () => {
    expect(SelectionSchema.safeParse({ ...base, phone: "1234567890" }).success).toBe(false);
  });

  it("caps quantity at 20", () => {
    const items = [{ itemId: "paneer-wrap", quantity: 21 }];
    expect(SelectionSchema.safeParse({ ...base, tableSlug: "t1", items }).success).toBe(false);
  });
});
