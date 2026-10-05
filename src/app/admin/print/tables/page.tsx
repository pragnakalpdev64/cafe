import type { Metadata } from "next";
import { LogoWordmark } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { qrSvg, siteUrlIsLocal, tableUrl } from "@/lib/qr";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "QR cards", robots: { index: false } };

/** Print-ready table cards: four per A4 sheet. Outside the dashboard layout so nothing else prints. */
export default async function PrintTablesPage() {
  await requireUser("OWNER");
  const tables = await db.cafeTable.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  const cards = await Promise.all(
    tables.map(async (t) => ({
      id: t.id,
      label: t.label,
      url: tableUrl(t.qrSlug),
      qr: await qrSvg(tableUrl(t.qrSlug)),
    })),
  );

  return (
    <div className="min-h-svh bg-muted print:bg-white">
      <style>{`@page { size: A4; margin: 10mm; }`}</style>
      <div className="mx-auto flex max-w-[190mm] flex-wrap items-center justify-between gap-3 px-4 py-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">QR cards · {cards.length} tables</h1>
          <p className="text-sm text-muted-foreground">
            Four cards per A4 sheet. Cut along the dotted lines. Use “Save as PDF” in the print window to send
            them to a printer.
          </p>
          {siteUrlIsLocal() && (
            <p className="mt-1 text-sm font-semibold text-destructive">
              These codes point to localhost – don&apos;t print them until the site is live.
            </p>
          )}
        </div>
        <PrintButton />
      </div>

      <div className="mx-auto grid max-w-[190mm] grid-cols-2 bg-white print:max-w-none">
        {cards.map((c) => (
          <section
            key={c.id}
            className="flex h-[138mm] break-inside-avoid flex-col items-center justify-between border border-dashed border-[#c8c2b6] px-[10mm] py-[9mm] text-center text-[#1c2b22]"
          >
            <LogoWordmark className="h-auto w-[62mm]" />
            <div>
              <p className="font-heading text-[7mm] leading-none font-bold">Scan for the menu</p>
              <p className="mt-[2mm] text-[3.4mm] text-[#566b5d]">
                Pick your food · staff will see your list
              </p>
            </div>
            <div
              className="w-[52mm] [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: c.qr }}
            />
            <div>
              <p className="font-heading text-[11mm] leading-none font-extrabold text-[#c2410c]">
                Table {c.label}
              </p>
              <p className="mt-[2mm] text-[2.8mm] break-all text-[#566b5d]">{c.url}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
