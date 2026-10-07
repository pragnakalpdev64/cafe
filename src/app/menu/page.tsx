import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { getCafeDetails, getPublicMenu } from "@/lib/data/menu";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Salads, chaats, sandwiches, toast, oats bowls and drinks – with protein and calories on every item.",
};

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  const [{ item }, menu, cafe] = await Promise.all([searchParams, getPublicMenu(), getCafeDetails()]);
  return (
    <MenuBrowser
      categories={menu.categories}
      items={menu.items}
      addOns={menu.addOns}
      orderingEnabled={cafe.orderingEnabled}
      initialItemId={typeof item === "string" ? item : undefined}
    />
  );
}
