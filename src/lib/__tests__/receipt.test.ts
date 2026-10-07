import { describe, expect, it } from "vitest";

import { receiptMessage, smsLink } from "@/lib/receipt";

describe("receipt SMS", () => {
  it("says the bill number, total and how it was paid", () => {
    expect(
      receiptMessage({ cafeName: "Healthy Hunger", number: 12, totalPaise: 34800, paymentMethod: "UPI" }),
    ).toBe("Thank you for visiting Healthy Hunger! Bill #12 – ₹348 paid by UPI. See you again soon.");
    expect(
      receiptMessage({ cafeName: "HH", number: 3, totalPaise: 120050, paymentMethod: "CASH" }),
    ).toContain("₹1,201 paid by cash");
  });

  it("builds an sms link with the Indian number and encoded text", () => {
    expect(smsLink("9876543210", "Bill #1 – ₹5 & more")).toBe(
      "sms:+919876543210?&body=Bill%20%231%20%E2%80%93%20%E2%82%B95%20%26%20more",
    );
  });
});
