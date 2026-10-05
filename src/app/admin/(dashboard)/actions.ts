"use server";

import { z } from "zod";
import { AuthError, assertUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const Ids = z.array(z.string().min(1).max(64)).min(1).max(50);

/** Staff clear a table's (or a guest's) list once it has been taken care of. */
export async function clearLists(ids: string[]): Promise<{ ok: true } | { error: string }> {
  try {
    await assertUser();
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const parsed = Ids.safeParse(ids);
  if (!parsed.success) return { error: "Nothing to clear." };
  await db.selection.deleteMany({ where: { id: { in: parsed.data } } });
  return { ok: true };
}
