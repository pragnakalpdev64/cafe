import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/pricing";

export const SelectionLinesSchema = z
  .array(
    z.object({
      itemId: z.string().min(1).max(40),
      addOnIds: z.array(z.string().min(1).max(40)).max(10).default([]),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    }),
  )
  .max(40);

export const GuestSelectionSchema = z
  .object({
    clientId: z.uuid(),
    tableSlug: z.string().trim().min(1).max(40).optional(),
    takeaway: z.boolean().optional(),
    items: SelectionLinesSchema,
  })
  .refine((v) => !!v.tableSlug !== !!v.takeaway, "Choose your table or takeaway");

export type GuestSelectionInput = z.input<typeof GuestSelectionSchema>;

/** One picked line as staff see it (names resolved on the server). */
export type SelectionLine = {
  itemId: string;
  name: string;
  quantity: number;
  addOns: { id: string; name: string }[];
};
