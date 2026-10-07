// Report ranges and chart buckets. Pure, so it's unit-tested. Dates are the café's local
// days (the server runs in IST), written yyyy-mm-dd.

export const RANGE_PRESETS = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
} as const;
export type RangePreset = keyof typeof RANGE_PRESETS;

export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export type ReportRange = {
  /** first day, inclusive */
  from: string;
  /** last day, inclusive */
  to: string;
  /** start of `from` and start of the day after `to`, for queries */
  start: Date;
  end: Date;
  days: number;
  preset: RangePreset | null;
};

/** A preset, or custom from/to days (swapped if reversed, capped at 366 days); defaults to today. */
export function resolveRange(
  input: { range?: string; from?: string; to?: string },
  now = new Date(),
): ReportRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from = today;
  let to = today;
  let preset: RangePreset | null = "today";
  const day = /^\d{4}-\d{2}-\d{2}$/;

  if (input.from && day.test(input.from)) {
    preset = null;
    from = parseDay(input.from);
    to = input.to && day.test(input.to) ? parseDay(input.to) : from;
    if (to < from) [from, to] = [to, from];
    if (to > today) to = today;
    if (from > to) from = to;
    if ((to.getTime() - from.getTime()) / 86_400_000 > 365) from = addDays(to, -365);
  } else if (input.range && input.range in RANGE_PRESETS) {
    preset = input.range as RangePreset;
    if (preset === "yesterday") from = to = addDays(today, -1);
    if (preset === "7d") from = addDays(today, -6);
    if (preset === "30d") from = addDays(today, -29);
    if (preset === "month") from = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  const end = addDays(to, 1);
  return {
    from: isoDay(from),
    to: isoDay(to),
    start: from,
    end,
    days: Math.round((end.getTime() - from.getTime()) / 86_400_000),
    preset,
  };
}

export type Bucket = { key: string; label: string; paise: number; bills: number };
type Row = { key: string; paise: number; bills: number };

const fill = (keys: { key: string; label: string }[], rows: Row[]): Bucket[] => {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return keys.map(({ key, label }) => ({
    key,
    label,
    paise: byKey.get(key)?.paise ?? 0,
    bills: byKey.get(key)?.bills ?? 0,
  }));
};

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;

/**
 * Hours from 8am to 10pm, widened to include any hour that had sales.
 * Row keys are the hour as a string ("0"–"23").
 */
export function fillHours(rows: Row[], first = 8, last = 22): Bucket[] {
  const hours = rows.filter((r) => r.paise > 0 || r.bills > 0).map((r) => Number(r.key));
  const lo = Math.min(first, ...hours);
  const hi = Math.max(last, ...hours);
  const keys = [];
  for (let h = lo; h <= hi; h++) keys.push({ key: String(h), label: hourLabel(h) });
  return fill(keys, rows);
}

/** Every day in the range (row keys yyyy-mm-dd). */
export function fillDays(rows: Row[], range: Pick<ReportRange, "start" | "days">): Bucket[] {
  const keys = [];
  for (let i = 0; i < range.days; i++) {
    const d = addDays(range.start, i);
    keys.push({ key: isoDay(d), label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
  }
  return fill(keys, rows);
}

/** The last `count` months up to `now` (row keys yyyy-mm). */
export function fillMonths(rows: Row[], now = new Date(), count = 12): Bucket[] {
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    });
  }
  return fill(keys, rows);
}
