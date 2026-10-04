import "server-only";
import { db } from "@/lib/db";
import { toRupees } from "@/lib/money";
import { mediaUrl } from "./menu";

/** Everything the menu manager shows, including hidden categories and items. */
export async function getAdminMenu() {
  const [categories, addOns] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { addOns: { select: { id: true } } },
        },
      },
    }),
    db.addOn.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { menuItems: true } } },
    }),
  ]);
  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      visible: c.visible,
      items: c.items.map((m) => ({
        id: m.id,
        name: m.name,
        category: c.slug,
        price: toRupees(m.pricePaise),
        protein: m.proteinG,
        kcal: m.kcal,
        photo: mediaUrl(m.photo),
        isBestseller: m.isBestseller,
        available: m.available,
        visible: m.visible,
      })),
    })),
    addOns: addOns.map((a) => ({
      id: a.id,
      name: a.name,
      price: toRupees(a.pricePaise),
      protein: a.proteinG,
      kcal: a.kcal,
      available: a.available,
      usedBy: a._count.menuItems,
    })),
  };
}

export type AdminMenu = Awaited<ReturnType<typeof getAdminMenu>>;

export async function getMenuItemForEdit(id: string) {
  const m = await db.menuItem.findUnique({ where: { id }, include: { addOns: { select: { id: true } } } });
  if (!m) return null;
  return {
    id: m.id,
    categoryId: m.categoryId,
    name: m.name,
    description: m.description,
    ingredients: m.ingredients,
    price: toRupees(m.pricePaise),
    protein: m.proteinG,
    kcal: m.kcal,
    photo: mediaUrl(m.photo),
    isBestseller: m.isBestseller,
    available: m.available,
    visible: m.visible,
    addOnIds: m.addOns.map((a) => a.id),
  };
}

export type EditableMenuItem = NonNullable<Awaited<ReturnType<typeof getMenuItemForEdit>>>;
