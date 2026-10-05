// Seeds the database from the owner's menu list. Safe to re-run: existing rows are
// left as they are, so edits made in the dashboard are never overwritten.
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { addOns, cafe, categories, menuItems, todaysPickId } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const paise = (rupees: number) => Math.round(rupees * 100);

async function main() {
  for (const [i, c] of categories.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, sortOrder: i },
    });
  }
  const categoryIds = Object.fromEntries(
    (await db.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );

  for (const [i, a] of addOns.entries()) {
    await db.addOn.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        name: a.name,
        pricePaise: paise(a.price),
        proteinG: a.protein,
        kcal: a.kcal,
        available: a.available,
        sortOrder: i,
      },
    });
  }

  for (const [i, m] of menuItems.entries()) {
    await db.menuItem.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        categoryId: categoryIds[m.category],
        name: m.name,
        description: m.description,
        ingredients: m.ingredients,
        pricePaise: paise(m.price),
        proteinG: m.protein,
        kcal: m.kcal,
        isBestseller: m.tags.includes("bestseller"),
        available: m.available,
        sortOrder: i,
        addOns: { connect: m.addOnIds.map((id) => ({ id })) },
      },
    });
  }

  // Placeholder tables until the owner confirms how many there are.
  for (let n = 1; n <= 6; n++) {
    await db.cafeTable.upsert({
      where: { label: `T${n}` },
      update: {},
      create: { label: `T${n}`, seats: 4, qrSlug: `t${n}`, sortOrder: n },
    });
  }

  await db.cafeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: cafe.name,
      address: cafe.address,
      mapUrl: cafe.mapUrl,
      phone: cafe.phone,
      whatsapp: cafe.whatsapp,
      instagram: cafe.instagram,
      hours: cafe.hours,
      todaysPickId,
    },
  });

  const username = process.env.SEED_OWNER_USERNAME;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (username && password && !(await db.staffUser.findFirst({ where: { role: "OWNER" } }))) {
    await db.staffUser.create({
      data: {
        name: "Owner",
        username,
        role: "OWNER",
        passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      },
    });
    console.log(`Created owner account "${username}" (password in .env → SEED_OWNER_PASSWORD).`);
  }

  console.log(
    `Seeded ${categories.length} categories, ${menuItems.length} items, ${addOns.length} add-ons, 6 tables.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
