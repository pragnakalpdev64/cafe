import { z } from "zod";
import { INDIAN_MOBILE } from "./phone";
import { SelectionLinesSchema } from "./selection";

/** Cashier confirms a guest's selection at the table, with the guest's name and phone. */
export const ConfirmSelectionSchema = z.object({
  selectionId: z.uuid(),
  name: z.string().trim().min(2, "Enter the guest's name").max(60, "Keep the name under 60 characters"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .pipe(z.string().regex(INDIAN_MOBILE, "Enter a 10-digit mobile number")),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
  marketingConsent: z.boolean().default(false),
  items: SelectionLinesSchema.min(1, "The order has no items"),
});

export type ConfirmSelectionInput = z.input<typeof ConfirmSelectionSchema>;
