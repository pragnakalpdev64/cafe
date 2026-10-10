// Loads the menu in prisma/seed-data.ts into the database, OVERWRITING names, descriptions,
// ingredients, prices, nutrition, bestseller tags, add-ons and visibility. Photos are kept.
//   pnpm menu:load            show what would change
//   pnpm menu:load --yes      apply it
// Dishes that aren't in the file are hidden, not deleted, so old orders keep their history.
// Use this for a new printed menu; day-to-day edits belong in the dashboard.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { addOns, categories, hiddenUntilPriced, menuItems, todaysPickId } from "../prisma/seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const paise = (rupees: number) => Math.round(rupees * 100);
const apply = process.argv.includes("--yes");

async function main() {
  const [existingItems, existingAddOns] = await Promise.all([
    db.menuItem.findMany({ select: { id: true, name: true, visible: true } }),
    db.addOn.findMany({ select: { id: true, name: true, available: true } }),
  ]);
  const itemIds = new Set(menuItems.map((m) => m.id));
  const addOnIds = new Set(addOns.map((a) => a.id));
  const known = new Set(existingItems.map((i) => i.id));
  const toHide = existingItems.filter((i) => !itemIds.has(i.id) && i.visible);
  const oldAddOns = existingAddOns.filter((a) => !addOnIds.has(a.id) && a.available);

  console.log(
    `${menuItems.length} dishes in the file: ${menuItems.filter((m) => !known.has(m.id)).length} new, ${menuItems.filter((m) => known.has(m.id)).length} updated.`,
  );
  console.log(
    `Hidden until priced (${hiddenUntilPriced.length}): ${menuItems
      .filter((m) => hiddenUntilPriced.includes(m.id))
      .map((m) => m.name)
      .join(", ")}`,
  );
  console.log(`Old dishes to hide (${toHide.length}): ${toHide.map((i) => i.name).join(", ") || "none"}`);
  console.log(
    `Old add-ons to switch off (${oldAddOns.length}): ${oldAddOns.map((a) => a.name).join(", ") || "none"}`,
  );
  if (!apply) {
    console.log("\nNothing changed. Run again with --yes to apply.");
    return;
  }

  await db.$transaction(async (tx) => {
    for (const [i, c] of categories.entries()) {
      await tx.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, sortOrder: i, visible: true },
        create: { slug: c.slug, name: c.name, sortOrder: i },
      });
    }
    const categoryIds = Object.fromEntries(
      (await tx.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
    );

    for (const [i, a] of addOns.entries()) {
      const data = {
        name: a.name,
        pricePaise: paise(a.price),
        proteinG: a.protein,
        kcal: a.kcal,
        available: a.available,
        sortOrder: i,
      };
      await tx.addOn.upsert({ where: { id: a.id }, update: data, create: { id: a.id, ...data } });
    }
    await tx.addOn.updateMany({ where: { id: { notIn: [...addOnIds] } }, data: { available: false } });

    for (const [i, m] of menuItems.entries()) {
      const data = {
        categoryId: categoryIds[m.category],
        name: m.name,
        description: m.description,
        ingredients: m.ingredients,
        pricePaise: paise(m.price),
        proteinG: m.protein,
        kcal: m.kcal,
        isBestseller: m.tags.includes("bestseller"),
        isVeg: m.isVeg,
        available: m.available,
        visible: !hiddenUntilPriced.includes(m.id),
        sortOrder: i,
      };
      const links = m.addOnIds.map((id) => ({ id }));
      await tx.menuItem.upsert({
        where: { id: m.id },
        update: { ...data, addOns: { set: links } }, // photo is left as it is
        create: { id: m.id, ...data, addOns: { connect: links } },
      });
    }
    // old dishes: hidden and moved below the current menu in the dashboard
    await tx.menuItem.updateMany({
      where: { id: { notIn: [...itemIds] } },
      data: { visible: false, sortOrder: 1000 },
    });

    // Today's pick must be a dish guests can see
    const settings = await tx.cafeSettings.findUnique({ where: { id: 1 }, select: { todaysPickId: true } });
    const pick = settings?.todaysPickId
      ? await tx.menuItem.findFirst({
          where: { id: settings.todaysPickId, visible: true },
          select: { id: true },
        })
      : null;
    if (settings && !pick) await tx.cafeSettings.update({ where: { id: 1 }, data: { todaysPickId } });
  });

  console.log(
    "\nMenu loaded. Restart the site (or save any dish in the dashboard) so guests see it straight away.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
