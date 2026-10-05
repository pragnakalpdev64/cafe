import { describe, expect, it } from "vitest";

import { toPaise, toRupees } from "@/lib/money";

describe("money", () => {
  it("converts rupees to whole paise", () => {
    expect(toPaise(249)).toBe(24900);
    expect(toPaise(19.99)).toBe(1999);
    // 1.005 * 100 is 100.49999… in floating point
    expect(toPaise(1.005)).toBe(100);
  });

  it("round-trips", () => {
    expect(toRupees(toPaise(269.5))).toBe(269.5);
  });
});
