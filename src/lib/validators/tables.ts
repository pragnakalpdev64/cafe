import { z } from "zod";

export const TableSchema = z.object({
  id: z.string().optional(),
  label: z
    .string()
    .trim()
    .min(1, "Give the table a name, like T7")
    .max(20, "Keep the name under 20 characters"),
  seats: z.coerce
    .number({ error: "Seats must be a number" })
    .int("Seats must be a whole number")
    .min(1, "At least 1 seat")
    .max(30, "That's a lot of seats – check the number"),
});
