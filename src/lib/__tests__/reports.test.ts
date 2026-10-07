import { describe, expect, it } from "vitest";

import { fillDays, fillHours, fillMonths, resolveRange } from "@/lib/reports";

const now = new Date(2026, 9, 7, 21, 30); // 7 Oct 2026, 9:30 pm

describe("resolveRange", () => {
  it("defaults to today and resolves presets", () => {
    expect(resolveRange({}, now)).toMatchObject({
      from: "2026-10-07",
      to: "2026-10-07",
      days: 1,
      preset: "today",
    });
    expect(resolveRange({ range: "yesterday" }, now)).toMatchObject({ from: "2026-10-06", to: "2026-10-06" });
    expect(resolveRange({ range: "7d" }, now)).toMatchObject({ from: "2026-10-01", days: 7 });
    expect(resolveRange({ range: "month" }, now)).toMatchObject({ from: "2026-10-01", to: "2026-10-07" });
  });

  it("swaps reversed custom days and stops at today", () => {
    expect(resolveRange({ from: "2026-10-05", to: "2026-10-02" }, now)).toMatchObject({
      from: "2026-10-02",
      to: "2026-10-05",
      days: 4,
      preset: null,
    });
    expect(resolveRange({ from: "2026-10-06", to: "2027-01-01" }, now)).toMatchObject({ to: "2026-10-07" });
  });

  it("ends at the start of the day after the last day", () => {
    const r = resolveRange({ range: "today" }, now);
    expect(r.end.getTime() - r.start.getTime()).toBe(86_400_000);
  });
});

describe("buckets", () => {
  it("fills café hours and widens for late sales", () => {
    const hours = fillHours([{ key: "13", paise: 500, bills: 1 }]);
    expect(hours[0].label).toBe("8am");
    expect(hours.at(-1)?.label).toBe("10pm");
    expect(hours.find((h) => h.key === "13")).toMatchObject({ label: "1pm", paise: 500 });
    expect(fillHours([{ key: "23", paise: 100, bills: 1 }]).at(-1)?.label).toBe("11pm");
  });

  it("fills every day and the last 12 months", () => {
    const days = fillDays([{ key: "2026-10-02", paise: 900, bills: 2 }], resolveRange({ range: "7d" }, now));
    expect(days).toHaveLength(7);
    expect(days[1]).toMatchObject({ key: "2026-10-02", paise: 900 });
    const months = fillMonths([], now);
    expect(months).toHaveLength(12);
    expect(months.at(-1)?.key).toBe("2026-10");
    expect(months[0].key).toBe("2025-11");
  });
});
