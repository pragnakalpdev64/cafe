// The counter cash drawer, one café day at a time. Pure, so it's unit-tested.
//   expected in the drawer = opening cash + cash sales − expenses paid in cash
// If nobody enters the morning cash, the day opens with the last day's closing:
// the counted amount if it was closed, otherwise what that day expected.

export type DrawerTotals = { openingPaise: number; cashSalesPaise: number; cashExpensesPaise: number };

export const expectedCash = (t: DrawerTotals) => t.openingPaise + t.cashSalesPaise - t.cashExpensesPaise;

export type CountResult = { kind: "match" | "short" | "extra"; paise: number };

/** Counted vs expected: short when there's less cash than there should be. */
export function compareCount(countedPaise: number, expectedPaise: number): CountResult {
  const diff = countedPaise - expectedPaise;
  return { kind: diff === 0 ? "match" : diff < 0 ? "short" : "extra", paise: Math.abs(diff) };
}

/**
 * Opening cash carried from the last recorded day.
 * `netSincePaise` = cash sales − cash expenses after that day's own figures
 * (for a day left open, its own sales and expenses count too – the caller includes them).
 */
export function carriedOpening(
  last: { openingPaise: number; countedPaise: number | null; closed: boolean } | null,
  netSincePaise: number,
) {
  if (!last) return Math.max(0, netSincePaise);
  const base = last.closed && last.countedPaise !== null ? last.countedPaise : last.openingPaise;
  return base + netSincePaise;
}
