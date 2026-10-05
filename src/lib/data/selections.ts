import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { maskPhone } from "@/lib/phone-mask";
import type { SelectionLine } from "@/lib/validators/selection";

/** Lists untouched for this long are treated as finished and hidden. */
const STALE_MS = 12 * 60 * 60 * 1000;
/** …and deleted after this long (promised on the privacy page). */
export const SELECTION_RETENTION_HOURS = 24;

export type GuestList = { id: string; items: SelectionLine[]; updatedAt: string };
export type TableLists = { tableId: string; label: string; guests: GuestList[] };
export type TakeawayList = GuestList & { phone: string };
export type LiveLists = { tables: TableLists[]; takeaway: TakeawayList[]; serverTime: string };

/** Deletes lists past the retention window, so phone numbers don't linger. Cheap (indexed). */
export function purgeOldSelections() {
  return db.selection.deleteMany({
    where: { updatedAt: { lt: new Date(Date.now() - SELECTION_RETENTION_HOURS * 60 * 60 * 1000) } },
  });
}

export async function getLiveLists(role: Role): Promise<LiveLists> {
  await purgeOldSelections();
  const [tables, selections] = await Promise.all([
    db.cafeTable.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    db.selection.findMany({
      where: { updatedAt: { gt: new Date(Date.now() - STALE_MS) } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const toGuest = (s: (typeof selections)[number]): GuestList => ({
    id: s.id,
    items: s.items as SelectionLine[],
    updatedAt: s.updatedAt.toISOString(),
  });
  return {
    tables: tables.map((t) => ({
      tableId: t.id,
      label: t.label,
      guests: selections.filter((s) => s.tableId === t.id).map(toGuest),
    })),
    takeaway: selections
      .filter((s) => !s.tableId && s.phone)
      .map((s) => ({ ...toGuest(s), phone: role === "OWNER" ? s.phone! : maskPhone(s.phone!) })),
    serverTime: new Date().toISOString(),
  };
}
