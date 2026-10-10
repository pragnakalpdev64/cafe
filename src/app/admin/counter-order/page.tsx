import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { requireUser } from "@/lib/auth/dal";
import { getPublicMenu } from "@/lib/data/menu";

export const metadata: Metadata = { title: "Counter order", robots: { index: false } };

/**
 * Staff take a walk-in guest's order with the same menu guests see on their phones.
 * Full screen (outside the dashboard layout) so it looks and works exactly like the QR menu.
 */
export default async function CounterOrderPage() {
  await requireUser();
  const menu = await getPublicMenu();
  return (
    <MenuBrowser
      categories={menu.categories}
      items={menu.items}
      addOns={menu.addOns}
      // staff can take counter orders even while guest ordering is switched off
      orderingEnabled
      counter
    />
  );
}
