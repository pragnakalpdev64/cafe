"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/validators/menu";

async function owner(): Promise<CurrentUser | { error: string }> {
  try {
    return await assertUser("OWNER");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const CustomerId = z.string().min(1).max(40);
const NotesSchema = z.object({
  id: CustomerId,
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters"),
});

/** Private staff notes on a guest ("allergic to peanuts", "likes extra chutney"). */
export async function saveCustomerNotes(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = NotesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0].message, fieldErrors: { notes: parsed.error.issues[0].message } };
  const updated = await db.customer.updateMany({
    where: { id: parsed.data.id },
    data: { notes: parsed.data.notes || null },
  });
  if (updated.count === 0) return { error: "Customer not found." };
  revalidatePath(`/admin/customers/${parsed.data.id}`);
  return { ok: true };
}

/** The guest asked to stop offers. Only the guest can give consent, so there's no way to switch it back on here. */
export async function withdrawConsent(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = CustomerId.safeParse(id);
  if (!parsed.success) return { error: "Customer not found." };
  const updated = await db.customer.updateMany({
    where: { id: parsed.data },
    data: { marketingConsent: false, consentAt: null },
  });
  if (updated.count === 0) return { error: "Customer not found." };
  revalidatePath(`/admin/customers/${parsed.data}`);
  revalidatePath("/admin/customers");
  return { ok: true };
}

/** Shown on old orders and bills after a guest's data is deleted. */
const DELETED_NAME = "Deleted on request";

/**
 * Delete a guest's personal data on request (DPDP Act). The customer record goes; old orders and
 * bills keep their amounts for the accounts but lose the name and phone.
 */
export async function deleteCustomer(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await owner();
  if ("error" in me) return me;
  const parsed = CustomerId.safeParse(id);
  if (!parsed.success) return { error: "Customer not found." };
  const customer = await db.customer.findUnique({
    where: { id: parsed.data },
    select: { id: true, phone: true },
  });
  if (!customer) return { error: "Customer not found." };

  // bills first: they're found through the orders, which are unlinked next
  await db.$transaction([
    db.bill.updateMany({
      where: { OR: [{ customerPhone: customer.phone }, { orders: { some: { customerId: customer.id } } }] },
      data: { customerName: DELETED_NAME, customerPhone: null },
    }),
    db.order.updateMany({
      where: { OR: [{ customerId: customer.id }, { customerPhone: customer.phone }] },
      data: { customerName: DELETED_NAME, customerPhone: null, customerId: null },
    }),
    db.rateLimit.deleteMany({ where: { key: `order-phone:${customer.phone}` } }),
    db.customer.delete({ where: { id: customer.id } }),
  ]);
  revalidatePath("/admin/customers");
  return { ok: true };
}
