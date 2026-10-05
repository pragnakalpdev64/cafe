import { connection } from "next/server";
import { CafeJsonLd } from "@/components/landing/cafe-json-ld";
import { Hero } from "@/components/landing/hero";
import { Bestsellers, OurPromise, TodaysPick, VisitUs } from "@/components/landing/sections";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getCafeDetails, getPublicMenu } from "@/lib/data/menu";

export default async function HomePage() {
  // Rendered per request (cheap – the data below is cached) so builds don't need the database.
  await connection();
  const [{ items }, cafe] = await Promise.all([getPublicMenu(), getCafeDetails()]);
  const pick = items.find((m) => m.id === cafe.todaysPickId) ?? items[0];
  const bestsellers = items.filter((m) => m.tags.includes("bestseller"));

  return (
    <>
      <CafeJsonLd cafe={cafe} />
      <SiteHeader />
      <main>
        {pick && <Hero pick={{ name: pick.name, protein: pick.protein, kcal: pick.kcal }} />}
        {pick && <TodaysPick item={pick} />}
        <OurPromise />
        {bestsellers.length > 0 && <Bestsellers items={bestsellers} />}
        <VisitUs cafe={cafe} />
      </main>
      <SiteFooter cafe={cafe} />
    </>
  );
}
