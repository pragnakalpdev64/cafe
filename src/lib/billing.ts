import { billTotals } from "./pricing";

// Bills combine every round of a table visit. Pure, so it's unit-tested.

export type BillSourceItem = {
  itemName: string;
  unitPricePaise: number;
  quantity: number;
  addOns: { name: string }[];
};

export type BillLine = {
  name: string;
  addOns: string[];
  unitPricePaise: number;
  quantity: number;
  amountPaise: number;
};

/** Same dish with the same add-ons at the same price becomes one line, in first-seen order. */
export function mergeBillLines(items: BillSourceItem[]): BillLine[] {
  const lines = new Map<string, BillLine>();
  for (const i of items) {
    const addOns = i.addOns.map((a) => a.name).sort();
    const key = [i.itemName, i.unitPricePaise, ...addOns].join("|");
    const line = lines.get(key);
    if (line) {
      line.quantity += i.quantity;
      line.amountPaise += i.unitPricePaise * i.quantity;
    } else {
      lines.set(key, {
        name: i.itemName,
        addOns,
        unitPricePaise: i.unitPricePaise,
        quantity: i.quantity,
        amountPaise: i.unitPricePaise * i.quantity,
      });
    }
  }
  return [...lines.values()];
}

/** Bill totals from the rounds' subtotals and the tax rate at billing time. */
export function billFromOrders(orders: { subtotalPaise: number }[], taxBasisPoints: number) {
  return billTotals(
    orders.reduce((s, o) => s + o.subtotalPaise, 0),
    taxBasisPoints,
  );
}
