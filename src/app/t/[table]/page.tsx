import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { getActiveTables, getCafeDetails, getPublicMenu } from "@/lib/data/menu";

export const metadata: Metadata = {
  title: "Menu",
  robots: { index: false },
};

/** Opened from a table's QR card: same menu, with the table already set. */
export default async function TableMenuPage({ params }: PageProps<"/t/[table]">) {
  const { table: slug } = await params;
  const [menu, cafe, tables] = await Promise.all([getPublicMenu(), getCafeDetails(), getActiveTables()]);
  const table = tables.find((t) => t.slug === slug.toLowerCase());
  if (!table) redirect("/menu");
  return (
    <MenuBrowser
      categories={menu.categories}
      items={menu.items}
      addOns={menu.addOns}
      orderingEnabled={cafe.orderingEnabled}
      tables={tables}
      table={table}
    />
  );
}
