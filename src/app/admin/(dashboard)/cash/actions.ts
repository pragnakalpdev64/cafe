"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, assertUser, type CurrentUser } from "@/lib/auth/dal";
import { expectedCash } from "@/lib/cash";
import { dayBounds, getDrawerDay, moneyBetween, today } from "@/lib/data/cash";
import { db } from "@/lib/db";
import { CloseDaySchema, ExpenseSchema, OpeningSchema } from "@/lib/validators/cash";
import { fieldErrors, type FormState } from "@/lib/validators/menu";

async function signedIn(role?: "OWNER"): Promise<CurrentUser | { error: string }> {
  try {
    return await assertUser(role);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

const refresh = () => {
  revalidatePath("/admin/cash");
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
};

/* ------------------------------- drawer ------------------------------- */

/** Morning count: the cash in the drawer before the café opens (today only, until it's closed). */
export async function setOpeningCash(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn();
  if ("error" in me) return me;
  const parsed = OpeningSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const day = today();
  const existing = await db.cashDay.findUnique({ where: { day }, select: { closedAt: true } });
  if (existing?.closedAt) return { error: "Today is already closed. Ask the owner to reopen it." };
  await db.cashDay.upsert({
    where: { day },
    create: { day, openingPaise: parsed.data.amount, openingSource: "ENTERED", openedById: me.id },
    update: { openingPaise: parsed.data.amount, openingSource: "ENTERED", openedById: me.id },
  });
  refresh();
  return { ok: true };
}

/** Night count: saves today's totals with what staff counted, so the day can't drift later. */
export async function closeDay(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn();
  if ("error" in me) return me;
  const parsed = CloseDaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const day = today();
  const drawer = await getDrawerDay(day);
  if (drawer.closed) return { error: "Today is already closed." };
  const { start, end } = dayBounds(day);
  const money = await moneyBetween(start, end);
  const totals = {
    openingPaise: drawer.openingPaise,
    cashSalesPaise: money.cashSalesPaise,
    cashExpensesPaise: money.cashExpensesPaise,
  };
  const close = {
    closedAt: new Date(),
    closedById: me.id,
    cashSalesPaise: totals.cashSalesPaise,
    cashExpensesPaise: totals.cashExpensesPaise,
    expectedPaise: expectedCash(totals),
    countedPaise: parsed.data.counted,
    closeNote: parsed.data.note || null,
  };
  await db.cashDay.upsert({
    where: { day },
    create: { day, openingPaise: drawer.openingPaise, openingSource: "CARRIED", ...close },
    update: close,
  });
  refresh();
  return { ok: true };
}

/**
 * Owner only: undo today's closing (e.g. the count was typed wrong) so it can be counted again.
 * Past days stay closed – they can't be counted any more.
 */
export async function reopenDay(day: string): Promise<{ ok: true } | { error: string }> {
  const me = await signedIn("OWNER");
  if ("error" in me) return me;
  if (day !== today()) return { error: "Only today can be reopened." };
  const done = await db.cashDay.updateMany({
    where: { day, closedAt: { not: null } },
    data: {
      closedAt: null,
      closedById: null,
      cashSalesPaise: null,
      cashExpensesPaise: null,
      expectedPaise: null,
      countedPaise: null,
      closeNote: null,
    },
  });
  if (done.count === 0) return { error: "That day isn't closed." };
  refresh();
  return { ok: true };
}

/* ------------------------------- expenses ------------------------------- */

/**
 * Add an expense (staff and owner), or edit one (owner only). Staff can only record today;
 * the owner can pick an earlier day.
 */
export async function saveExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await signedIn();
  if ("error" in me) return me;
  const parsed = ExpenseSchema.safeParse(
    Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")),
  );
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, amount, category, paidWith, day, paidTo, note } = parsed.data;
  if (id && me.role !== "OWNER") return { error: "Only the owner can change an expense." };

  const todayKey = today();
  const when = day && me.role === "OWNER" ? day : todayKey;
  if (when > todayKey)
    return { error: "That date is in the future.", fieldErrors: { day: "Pick today or earlier" } };
  // a closed drawer keeps its saved totals, so cash taken from it afterwards would go missing
  if (paidWith === "CASH") {
    const closed = await db.cashDay.findUnique({ where: { day: when }, select: { closedAt: true } });
    if (closed?.closedAt)
      return {
        error:
          when === todayKey
            ? "Today's cash drawer is already closed. Ask the owner to reopen it, or pick another way it was paid."
            : `The cash drawer for ${when} is closed – pick another way it was paid.`,
      };
  }
  // today's expenses get the real time; earlier days are dated at noon of that day
  const paidAt = when === todayKey ? new Date() : new Date(`${when}T12:00:00`);
  const data = { amountPaise: amount, category, paidWith, paidTo: paidTo || null, note: note || null };

  if (id) {
    const updated = await db.expense.updateMany({ where: { id }, data: { ...data, paidAt } });
    if (updated.count === 0) return { error: "Expense not found." };
  } else {
    await db.expense.create({ data: { ...data, paidAt, createdById: me.id } });
  }
  refresh();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await signedIn("OWNER");
  if ("error" in me) return me;
  const parsed = z.string().min(1).max(40).safeParse(id);
  if (!parsed.success) return { error: "Expense not found." };
  const done = await db.expense.deleteMany({ where: { id: parsed.data } });
  if (done.count === 0) return { error: "Expense not found." };
  refresh();
  return { ok: true };
}
