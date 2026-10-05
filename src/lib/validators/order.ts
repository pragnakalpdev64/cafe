import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/pricing";
import { INDIAN_MOBILE } from "./phone";

export const PlaceOrderSchema = z
  .object({
    tableSlug: z.string().trim().min(1).max(40).optional(),
    takeaway: z.boolean().optional(),
    name: z.string().trim().min(2, "Enter your name").max(60, "Keep your name under 60 characters"),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
      .pipe(z.string().regex(INDIAN_MOBILE, "Enter a 10-digit mobile number")),
    note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
    marketingConsent: z.boolean().default(false),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1).max(40),
          addOnIds: z.array(z.string().min(1).max(40)).max(10).default([]),
          quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
        }),
      )
      .min(1, "Your list is empty")
      .max(40, "That's a very long order – please order at the counter"),
  })
  .refine((v) => !!v.tableSlug !== !!v.takeaway, "Choose your table or takeaway");

export type PlaceOrderInput = z.input<typeof PlaceOrderSchema>;
