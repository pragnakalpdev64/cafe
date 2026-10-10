import { z } from "zod";

/** Rupees typed by staff (₹ and commas allowed), stored as paise. */
export const rupeesToPaise = (label: string, { allowZero = false } = {}) =>
  z
    .string()
    .trim()
    .transform((v) => (v.replace(/[₹,\s]/g, "") === "" ? NaN : Number(v.replace(/[₹,\s]/g, ""))))
    .pipe(
      z
        .number({ error: `${label} must be a number` })
        .min(allowZero ? 0 : 0.01, allowZero ? `${label} can't be negative` : `${label} must be more than ₹0`)
        .max(1_000_000, `${label} looks too high`)
        .refine(
          (v) => Math.round(v * 100) === Math.round(v * 100 * 1e6) / 1e6,
          `${label} can have at most 2 decimals`,
        ),
    )
    .transform((v) => Math.round(v * 100));

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const ExpenseSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  amount: rupeesToPaise("Amount"),
  category: z.enum(
    [
      "VEGETABLES_FRUITS",
      "GROCERY",
      "DAIRY",
      "PACKAGING",
      "GAS",
      "ELECTRICITY_WATER",
      "RENT",
      "SALARIES",
      "REPAIRS",
      "OTHER",
    ],
    { error: "Pick what it was for" },
  ),
  paidWith: z.enum(["CASH", "UPI", "CARD", "BANK"], { error: "Pick how it was paid" }),
  day: day.optional(),
  paidTo: z.string().trim().max(80, "Keep it under 80 characters").optional(),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
});

export const OpeningSchema = z.object({ amount: rupeesToPaise("Opening cash", { allowZero: true }) });

export const CloseDaySchema = z.object({
  counted: rupeesToPaise("Counted cash", { allowZero: true }),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
});
