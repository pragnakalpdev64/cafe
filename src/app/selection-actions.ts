"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publish } from "@/lib/realtime";
import { clientIp } from "@/lib/request-ip";
import {
  type GuestSelectionInput,
  GuestSelectionSchema,
  type SelectionLine,
} from "@/lib/validators/selection";

/** Selections untouched this long are removed (a guest who left without ordering). */
const SELECTION_TTL_MS = 12 * 60 * 60 * 1000;

export type SyncResult = { ok: true; code: number } | { ok: false; error: string };

/**
 * The guest's list, mirrored live to the dashboard while they pick.
 * Names come from the database, never from the browser.
 */
export async function syncSelection(input: GuestSelectionInput): Promise<SyncResult> {
  const parsed = GuestSelectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { clientId, tableSlug, items } = parsed.data;

  if (!(await consumeRateLimit(`selection:${await clientIp()}`, 400, 10 * 60))) {
    return { ok: false, error: "Too many updates. Please wait a minute." };
  }
  await db.selection.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - SELECTION_TTL_MS) } } });

  const existing = await db.selection.findUnique({ where: { id: clientId } });

  if (items.length === 0) {
    // an emptied list disappears from the dashboard (a confirmed one stays for the guest's phone)
    if (existing && existing.status !== "CONFIRMED") {
      await db.selection.delete({ where: { id: clientId } });
      await publish({ type: "selection", selectionId: clientId });
    }
    return { ok: true, code: existing?.code ?? 0 };
  }

  const table = tableSlug
    ? await db.cafeTable.findFirst({ where: { qrSlug: tableSlug, active: true }, select: { id: true } })
    : null;
  if (tableSlug && !table) return { ok: false, error: "That table isn't available. Please ask staff." };

  const menuItems = await db.menuItem.findMany({
    where: { id: { in: items.map((i) => i.itemId) }, visible: true, category: { visible: true } },
    select: { id: true, name: true, addOns: { select: { id: true, name: true } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));
  const lines: SelectionLine[] = [];
  for (const i of items) {
    const m = byId.get(i.itemId);
    if (!m) continue; // removed from the menu since the guest picked it
    const allowed = new Map(m.addOns.map((a) => [a.id, a.name]));
    lines.push({
      itemId: m.id,
      name: m.name,
      quantity: i.quantity,
      addOns: i.addOnIds.filter((id) => allowed.has(id)).map((id) => ({ id, name: allowed.get(id)! })),
    });
  }

  const where = { tableId: table?.id ?? null, takeaway: !table };
  // a new list after a confirmed order starts a fresh round
  const fresh = !existing || existing.status === "CONFIRMED";
  const row = await db.selection.upsert({
    where: { id: clientId },
    create: { id: clientId, ...where, code: randomCode(), items: lines },
    update: { ...where, items: lines, ...(fresh && { status: "SELECTING", readyAt: null, orderId: null }) },
    select: { code: true },
  });
  await publish({ type: "selection", selectionId: clientId });
  return { ok: true, code: row.code };
}

/** Guest tapped Confirm ("I'm done") – or changed their mind. Staff are alerted on READY. */
export async function setSelectionReady(
  clientId: string,
  ready: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const id = z.uuid().safeParse(clientId);
  if (!id.success) return { ok: false, error: "Something went wrong. Please refresh the page." };
  const updated = await db.selection.updateMany({
    where: { id: id.data, status: { not: "CONFIRMED" } },
    data: ready ? { status: "READY", readyAt: new Date() } : { status: "SELECTING", readyAt: null },
  });
  if (updated.count === 0) return { ok: false, error: "Your list wasn't found. Add an item and try again." };
  await publish({ type: "selection", selectionId: id.data });
  return { ok: true };
}

function randomCode() {
  return 1000 + Math.floor(Math.random() * 9000);
}
