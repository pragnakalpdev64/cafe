import { describe, expect, it } from "vitest";

import { carriedOpening, compareCount, expectedCash } from "@/lib/cash";
import { CloseDaySchema, ExpenseSchema, OpeningSchema } from "@/lib/validators/cash";

describe("cash drawer", () => {
  it("expects opening + cash sales − cash expenses", () => {
    expect(expectedCash({ openingPaise: 200000, cashSalesPaise: 150000, cashExpensesPaise: 30000 })).toBe(
      320000,
    );
  });

  it("says short, extra or match", () => {
    expect(compareCount(310000, 320000)).toEqual({ kind: "short", paise: 10000 });
    expect(compareCount(325000, 320000)).toEqual({ kind: "extra", paise: 5000 });
    expect(compareCount(320000, 320000)).toEqual({ kind: "match", paise: 0 });
  });

  it("carries the last closing count, or what an unclosed day expected", () => {
    expect(carriedOpening({ openingPaise: 100000, countedPaise: 250000, closed: true }, 0)).toBe(250000);
    // closed two days ago, then a day nobody opened sold ₹500 in cash
    expect(carriedOpening({ openingPaise: 100000, countedPaise: 250000, closed: true }, 50000)).toBe(300000);
    // last day left open: its opening + its own net cash
    expect(carriedOpening({ openingPaise: 100000, countedPaise: null, closed: false }, 40000)).toBe(140000);
    expect(carriedOpening(null, 0)).toBe(0);
  });
});

describe("cash forms", () => {
  it("reads rupees with ₹ and commas as paise", () => {
    expect(OpeningSchema.parse({ amount: "₹2,000" }).amount).toBe(200000);
    expect(CloseDaySchema.parse({ counted: "3150.50" }).counted).toBe(315050);
    expect(OpeningSchema.safeParse({ amount: "0" }).success).toBe(true);
  });

  it("checks expenses", () => {
    const ok = { amount: "450", category: "VEGETABLES_FRUITS", paidWith: "CASH" };
    expect(ExpenseSchema.parse(ok).amount).toBe(45000);
    expect(ExpenseSchema.safeParse({ ...ok, amount: "0" }).success).toBe(false);
    expect(ExpenseSchema.safeParse({ ...ok, amount: "12.345" }).success).toBe(false);
    expect(ExpenseSchema.safeParse({ ...ok, category: "TOYS" }).success).toBe(false);
  });
});
