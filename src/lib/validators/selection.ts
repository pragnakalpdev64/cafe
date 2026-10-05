import { z } from "zod";

export const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const SelectionSchema = z
  .object({
    clientId: z.uuid(),
    tableSlug: z.string().trim().min(1).max(40).optional(),
    phone: z
      .string()
      .trim()
      .regex(INDIAN_MOBILE, "Enter a 10-digit mobile number")
      .optional(),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1).max(40),
          addOnIds: z.array(z.string().min(1).max(40)).max(10).default([]),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .max(40),
  })
  .refine((v) => v.tableSlug || v.phone, "Pick a table or enter a phone number");

export type SelectionInput = z.input<typeof SelectionSchema>;

/** What staff see for one picked line (names resolved on the server). */
export type SelectionLine = {
  itemId: string;
  name: string;
  quantity: number;
  addOns: { id: string; name: string }[];
};
