import { expect, it } from "vitest";

import { maskPhone } from "@/lib/phone-mask";

it("masks the middle of a 10-digit number", () => {
  expect(maskPhone("9876543210")).toBe("98xxxxxx10");
});

it("leaves other lengths alone", () => {
  expect(maskPhone("12345")).toBe("12345");
});
