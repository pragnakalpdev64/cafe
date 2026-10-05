"use server";

import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { type SelectionInput, type SelectionLine, SelectionSchema } from "@/lib/validators/selection";

export type SyncResult = { ok: true; tableLabel?: string } | { ok: false; error: string };

/**
 * v1 has no ordering: a guest's picked items are saved so staff can see them.
 * Names come from the database, never from the browser.
 */
export async function syncSelection(input: SelectionInput): Promise<SyncResult> {
  const parsed = SelectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { clientId, tableSlug, phone, items } = parsed.data;

  if (!(await consumeRateLimit(`selection:${await clientIp()}`, 300, 10 * 60))) {
    return { ok: false, error: "Too many updates. Please wait a minute." };
  }

  if (items.length === 0) {
    await db.selection.deleteMany({ where: { id: clientId } });
    return { ok: true };
  }

  const table = tableSlug
    ? await db.cafeTable.findFirst({ where: { qrSlug: tableSlug, active: true }, select: { id: true, label: true } })
    : null;
  if (tableSlug && !table) return { ok: false, error: "That table isn't available. Ask staff for help." };

  const menuItems = await db.menuItem.findMany({
    where: { id: { in: items.map((i) => i.itemId) }, visible: true, category: { visible: true } },
    select: { id: true, name: true, addOns: { select: { id: true, name: true } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const lines: SelectionLine[] = [];
  for (const i of items) {
    const m = byId.get(i.itemId);
    if (!m) continue; // item removed from the menu since the guest picked it
    const allowed = new Map(m.addOns.map((a) => [a.id, a.name]));
    lines.push({
      itemId: m.id,
      name: m.name,
      quantity: i.quantity,
      addOns: i.addOnIds.filter((id) => allowed.has(id)).map((id) => ({ id, name: allowed.get(id)! })),
    });
  }

  const data = { tableId: table?.id ?? null, phone: table ? null : (phone ?? null), items: lines };
  await db.selection.upsert({ where: { id: clientId }, create: { id: clientId, ...data }, update: data });
  return { ok: true, tableLabel: table?.label };
}
