import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import type { Bucket } from "@/lib/reports";
import { cn } from "@/lib/utils";

const rupees = (paise: number) => formatINR(toRupees(paise));

/** Labels over bars near the edges hug that edge so they never spill out of the chart. */
const anchor = (i: number, n: number) =>
  i < n / 4 ? "left-0" : i >= (n * 3) / 4 ? "right-0" : "left-1/2 -translate-x-1/2";

/**
 * One-series column chart of sales (HTML, no chart library). Thin bars on a baseline, the peak
 * labelled directly, a tooltip on hover or keyboard focus, and the same numbers as a table.
 */
export function SalesBars({
  title,
  buckets,
  labelEvery = 1,
}: {
  title: string;
  buckets: Bucket[];
  labelEvery?: number;
}) {
  const max = Math.max(0, ...buckets.map((b) => b.paise));
  const peak = buckets.findIndex((b) => b.paise === max && max > 0);
  return (
    <figure className="rounded-3xl border border-border bg-card p-4">
      <figcaption className="mb-3 font-bold">{title}</figcaption>
      {max === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period.</p>
      ) : (
        <div
          className="flex h-44 items-end gap-0.5 border-b border-border pt-6"
          role="list"
          aria-label={title}
        >
          {buckets.map((b, i) => (
            <div
              key={b.key}
              role="listitem"
              tabIndex={0}
              aria-label={`${b.label}: ${rupees(b.paise)}, ${b.bills} bill${b.bills === 1 ? "" : "s"}`}
              className="group relative flex h-full flex-1 items-end justify-center outline-none"
            >
              {/* hit target is the whole column, wider than the bar */}
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-ring"
                style={{ height: `${Math.max(b.paise > 0 ? 2 : 0, (b.paise / max) * 100)}%` }}
              />
              {i === peak && (
                <span
                  className={cn(
                    "pointer-events-none absolute -top-4 tabular text-[10px] font-semibold whitespace-nowrap text-foreground group-hover:invisible",
                    anchor(i, buckets.length),
                  )}
                >
                  {rupees(b.paise)}
                </span>
              )}
              <span
                className={cn(
                  "pointer-events-none invisible absolute bottom-full z-10 mb-1 rounded-lg bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-border group-hover:visible group-focus-visible:visible",
                  anchor(i, buckets.length),
                )}
              >
                <span className="font-semibold">{b.label}</span> · {rupees(b.paise)} · {b.bills} bill
                {b.bills === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
      {max > 0 && (
        <div className="mt-1 flex gap-0.5 text-[10px] text-muted-foreground" aria-hidden>
          {buckets.map((b, i) => (
            <span key={b.key} className="flex-1 overflow-visible text-center whitespace-nowrap">
              {i % labelEvery === 0 ? b.label : ""}
            </span>
          ))}
        </div>
      )}
      {max > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">Show as table</summary>
          <table className="mt-2 w-full text-left tabular">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="font-medium">When</th>
                <th className="text-right font-medium">Bills</th>
                <th className="text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {buckets
                .filter((b) => b.bills > 0)
                .map((b) => (
                  <tr key={b.key} className="border-t border-border">
                    <td>{b.label}</td>
                    <td className="text-right">{b.bills}</td>
                    <td className="text-right">{rupees(b.paise)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}

/** Top dishes as horizontal bars (quantity), with the amount beside each. */
export function TopItems({ items }: { items: { name: string; quantity: number; paise: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.quantity));
  return (
    <figure className="rounded-3xl border border-border bg-card p-4">
      <figcaption className="mb-3 font-bold">Top items</figcaption>
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((it) => (
            <li
              key={it.name}
              className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
            >
              <span className="truncate" title={it.name}>
                {it.name}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={cn("h-3 rounded-r-[4px] bg-chart-1")}
                  style={{ width: `${(it.quantity / max) * 100}%` }}
                  aria-hidden
                />
                <span className="tabular text-xs font-semibold">{it.quantity}</span>
              </span>
              <span className="tabular text-xs text-muted-foreground">{rupees(it.paise)}</span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
