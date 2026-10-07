import { getCurrentUser } from "@/lib/auth/dal";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { toRupees } from "@/lib/money";

export const dynamic = "force-dynamic";

const day = (d: Date | null) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";

/** Owner only: every customer as a CSV file. `?offers=1` = only those who said yes to offers. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  if (user.role !== "OWNER")
    return Response.json({ error: "Only the owner can export customers." }, { status: 403 });

  const offersOnly = new URL(req.url).searchParams.get("offers") === "1";
  const customers = await db.customer.findMany({
    where: offersOnly ? { marketingConsent: true } : undefined,
    orderBy: { lastVisitAt: "desc" },
  });
  const csv = toCsv([
    [
      "Name",
      "Phone",
      "Email",
      "Visits",
      "Total spend (₹)",
      "First visit",
      "Last visit",
      "Offers OK",
      "Offers since",
      "Notes",
    ],
    ...customers.map((c) => [
      c.name,
      c.phone,
      c.email,
      c.orderCount,
      toRupees(c.totalSpendPaise),
      day(c.firstVisitAt),
      day(c.lastVisitAt),
      c.marketingConsent,
      day(c.consentAt),
      c.notes,
    ]),
  ]);
  const name = `healthy-hunger-customers${offersOnly ? "-offers" : ""}-${day(new Date())}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
