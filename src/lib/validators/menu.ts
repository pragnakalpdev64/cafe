import { z } from "zod";

const rupees = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .min(0, `${label} can't be negative`)
    .max(100000, `${label} looks too high`)
    .refine((v) => Math.round(v * 100) === v * 100, `${label} can have at most 2 decimals`);

const wholeNumber = (label: string, max: number) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} can't be negative`)
    .max(max, `${label} looks too high`);

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const MenuItemSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Pick a category"),
  name: z.string().trim().min(2, "Name is too short").max(80),
  description: z.string().trim().max(240, "Keep the description under 240 characters").default(""),
  ingredients: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
  price: rupees("Price").refine((v) => v > 0, "Price must be more than ₹0"),
  protein: wholeNumber("Protein", 500),
  kcal: wholeNumber("Calories", 5000),
  isBestseller: checkbox,
  available: checkbox,
  visible: checkbox,
  addOnIds: z.array(z.string()).default([]),
  removePhoto: checkbox,
});

export const AddOnSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is too short").max(60),
  price: rupees("Price"),
  protein: wholeNumber("Protein", 200),
  kcal: wholeNumber("Calories", 2000),
});

export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is too short").max(40),
});

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

export function fieldErrors(error: z.ZodError): FormState {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return { error: "Please fix the highlighted fields.", fieldErrors: out };
}

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "category"
  );
}
