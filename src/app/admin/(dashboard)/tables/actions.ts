"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { AuthError, assertUser } from "@/lib/auth/dal";
import { TABLES_TAG } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { fieldErrors, type FormState, slugify } from "@/lib/validators/menu";
import { TableSchema } from "@/lib/validators/tables";

function tablesChanged() {
  updateTag(TABLES_TAG);
  revalidatePath("/admin/tables");
}

async function owner(): Promise<{ error: string } | null> {
  try {
    await assertUser("OWNER");
    return null;
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
}

export async function saveTable(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await owner();
  if (denied) return denied;
  const parsed = TableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, label, seats } = parsed.data;

  try {
    if (id) {
      // the QR slug never changes, so printed cards keep working after a rename
      await db.cafeTable.update({ where: { id }, data: { label, seats } });
    } else {
      const base = slugify(label);
      let qrSlug = base;
      for (let n = 2; await db.cafeTable.findUnique({ where: { qrSlug } }); n++) qrSlug = `${base}-${n}`;
      const last = await db.cafeTable.aggregate({ _max: { sortOrder: true } });
      await db.cafeTable.create({
        data: { label, seats, qrSlug, sortOrder: (last._max.sortOrder ?? 0) + 1 },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        error: `There's already a table called “${label}”.`,
        fieldErrors: { label: "Name already used" },
      };
    }
    throw e;
  }
  tablesChanged();
  return { ok: true };
}

export async function setTableActive(id: string, active: boolean) {
  const denied = await owner();
  if (denied) return denied;
  await db.cafeTable.update({ where: { id }, data: { active } });
  tablesChanged();
  return { ok: true as const };
}

export async function deleteTable(id: string) {
  const denied = await owner();
  if (denied) return denied;
  // guests' lists for this table are removed with it (they are short-lived anyway)
  await db.$transaction([
    db.selection.deleteMany({ where: { tableId: id } }),
    db.cafeTable.delete({ where: { id } }),
  ]);
  tablesChanged();
  return { ok: true as const };
}
