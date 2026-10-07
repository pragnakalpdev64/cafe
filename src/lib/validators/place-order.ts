import { z } from "zod";
import { INDIAN_MOBILE } from "./phone";
import { SelectionLinesSchema } from "./selection";

/** The guest places their own order from the QR menu, with their name and phone. */
export const PlaceOrderSchema = z.object({
  clientId: z.uuid(),
  takeaway: z.boolean(),
  name: z.string().trim().min(2, "Enter your name").max(60, "Keep the name under 60 characters"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .pipe(z.string().regex(INDIAN_MOBILE, "Enter a 10-digit mobile number")),
  note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
  marketingConsent: z.boolean().default(false),
  items: SelectionLinesSchema.min(1, "Your list is empty"),
});

export type PlaceOrderInput = z.input<typeof PlaceOrderSchema>;
