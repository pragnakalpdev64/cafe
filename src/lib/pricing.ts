// Order pricing. Pure functions so they can be unit-tested; callers load the menu
// from the database and never trust prices sent by the browser. All money in paise.

export type MenuAddOnPrice = { name: string; pricePaise: number; available: boolean };
export type MenuItemPrice = {
  name: string;
  pricePaise: number;
  available: boolean;
  /** add-ons this item allows, by id */
  addOns: Map<string, MenuAddOnPrice>;
};

export type RequestedLine = { itemId: string; addOnIds: string[]; quantity: number };

export type PricedLine = {
  menuItemId: string;
  itemName: string;
  addOns: { id: string; name: string; pricePaise: number }[];
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type PricingResult =
  { ok: true; lines: PricedLine[]; subtotalPaise: number } | { ok: false; problems: string[] };

export const MAX_LINE_QUANTITY = 20;

/** Prices requested lines against the current menu; any problem rejects the whole order. */
export function priceLines(requested: RequestedLine[], menu: Map<string, MenuItemPrice>): PricingResult {
  const problems: string[] = [];
  const lines: PricedLine[] = [];
  if (requested.length === 0) problems.push("Your list is empty.");

  for (const r of requested) {
    const item = menu.get(r.itemId);
    if (!item) {
      problems.push("An item in your list is no longer on the menu.");
      continue;
    }
    if (!item.available) problems.push(`${item.name} is sold out.`);
    if (!Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > MAX_LINE_QUANTITY) {
      problems.push(`Check the quantity of ${item.name}.`);
      continue;
    }
    const addOns: PricedLine["addOns"] = [];
    for (const id of new Set(r.addOnIds)) {
      const addOn = item.addOns.get(id);
      if (!addOn) problems.push(`An add-on for ${item.name} is no longer offered.`);
      else if (!addOn.available) problems.push(`${addOn.name} is sold out.`);
      else addOns.push({ id, name: addOn.name, pricePaise: addOn.pricePaise });
    }
    const unitPricePaise = item.pricePaise + addOns.reduce((s, a) => s + a.pricePaise, 0);
    lines.push({
      menuItemId: r.itemId,
      itemName: item.name,
      addOns,
      unitPricePaise,
      quantity: r.quantity,
      lineTotalPaise: unitPricePaise * r.quantity,
    });
  }

  if (problems.length) return { ok: false, problems: [...new Set(problems)] };
  return { ok: true, lines, subtotalPaise: lines.reduce((s, l) => s + l.lineTotalPaise, 0) };
}

/** Tax in basis points (500 = 5 %), rounded to the nearest paisa. */
export function billTotals(subtotalPaise: number, taxBasisPoints: number) {
  const taxPaise = Math.round((subtotalPaise * taxBasisPoints) / 10_000);
  return { subtotalPaise, taxBasisPoints, taxPaise, totalPaise: subtotalPaise + taxPaise };
}
