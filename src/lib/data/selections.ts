import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { maskPhone } from "@/lib/phone-mask";
import type { SelectionLine } from "@/lib/validators/selection";

/** Lists untouched for this long are treated as finished and hidden. */
const STALE_MS = 12 * 60 * 60 * 1000;

export type GuestList = { id: string; items: SelectionLine[]; updatedAt: string };
export type TableLists = { tableId: string; label: string; guests: GuestList[] };
export type TakeawayList = GuestList & { phone: string };
export type LiveLists = { tables: TableLists[]; takeaway: TakeawayList[]; serverTime: string };

export async function getLiveLists(role: Role): Promise<LiveLists> {
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
