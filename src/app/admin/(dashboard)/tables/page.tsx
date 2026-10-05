import { TablesManager } from "@/components/admin/tables-manager";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { qrSvg, siteUrlIsLocal, tableUrl } from "@/lib/qr";

export const metadata = { title: "Tables & QR" };

export default async function TablesPage() {
  await requireUser("OWNER");
  const tables = await db.cafeTable.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const rows = await Promise.all(
    tables.map(async (t) => ({
      id: t.id,
      label: t.label,
      seats: t.seats,
      active: t.active,
      url: tableUrl(t.qrSlug),
      qr: await qrSvg(tableUrl(t.qrSlug)),
    })),
  );
  return <TablesManager tables={rows} siteIsLocal={siteUrlIsLocal()} />;
}
