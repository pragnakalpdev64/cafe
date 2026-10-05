"use client";

import { Phone, RefreshCw, ShoppingBag, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { clearLists } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import type { GuestList, LiveLists as LiveListsData } from "@/lib/data/selections";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;
const FRESH_MS = 2 * 60 * 1000;

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

export function LiveLists({ initial }: { initial: LiveListsData }) {
  const [data, setData] = useState(initial);
  const [failed, setFailed] = useState(false);
  // compare against the server's clock so a wrong tablet clock doesn't mislabel lists
  const [skew, setSkew] = useState(() => Date.now() - new Date(initial.serverTime).getTime());
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/selections", { cache: "no-store" });
      if (res.status === 401) {
        // full navigation: this route clears the cookie, then sends the browser to login
        window.location.assign(new URL("/admin/session-ended", window.location.origin));
        return;
      }
      if (!res.ok) throw new Error();
      const next: LiveListsData = await res.json();
      setData(next);
      setSkew(Date.now() - new Date(next.serverTime).getTime());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void refresh();
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [refresh]);

  const serverNow = now - skew;
  const busy = data.tables.filter((t) => t.guests.length > 0);
  const free = data.tables.filter((t) => t.guests.length === 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Table lists</h1>
          <p className="text-sm text-muted-foreground">
            What guests have picked on the QR menu. Updates every 5 seconds. Clear a list once it&apos;s taken care of.
          </p>
        </div>
        <p className={cn("flex items-center gap-1.5 text-xs", failed ? "font-semibold text-destructive" : "text-muted-foreground")} role="status">
          <RefreshCw className={cn("size-3.5", !failed && "animate-[spin_5s_linear_infinite]")} aria-hidden />
          {failed ? "Can't reach the server – showing the last lists" : "Live"}
        </p>
      </div>

      <section aria-labelledby="tables-h" className="space-y-3">
        <h2 id="tables-h" className="text-lg font-bold">
          Tables <span className="text-sm font-normal text-muted-foreground">{busy.length} with lists</span>
        </h2>
        {busy.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
            No table has picked anything yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {busy.map((t) => (
              <ListCard
                key={t.tableId}
                title={`Table ${t.label}`}
                icon={<Users className="size-4" aria-hidden />}
                guests={t.guests}
                now={serverNow}
                onCleared={refresh}
              />
            ))}
          </div>
        )}
        {free.length > 0 && (
          <p className="text-sm text-muted-foreground">
            No list: {free.map((t) => t.label).join(", ")}
          </p>
        )}
      </section>

      <section aria-labelledby="takeaway-h" className="space-y-3">
        <h2 id="takeaway-h" className="text-lg font-bold">
          Takeaway{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {data.takeaway.length} list{data.takeaway.length === 1 ? "" : "s"}
          </span>
        </h2>
        {data.takeaway.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
            No takeaway lists right now.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.takeaway.map((g) => (
              <ListCard
                key={g.id}
                title={g.phone}
                icon={<Phone className="size-4" aria-hidden />}
                guests={[g]}
                now={serverNow}
                onCleared={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ListCard({
  title,
  icon,
  guests,
  now,
  onCleared,
}: {
  title: string;
  icon: React.ReactNode;
  guests: GuestList[];
  now: number;
  onCleared: () => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const latest = guests.reduce((a, g) => (g.updatedAt > a ? g.updatedAt : a), guests[0].updatedAt);
  const fresh = now - new Date(latest).getTime() < FRESH_MS;
  const count = guests.reduce((n, g) => n + g.items.reduce((m, i) => m + i.quantity, 0), 0);

  const clear = (ids: string[], label: string) =>
    start(async () => {
      const res = await clearLists(ids);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success(`${label} cleared`);
        await onCleared();
      }
    });

  return (
    <article
      className={cn(
        "flex flex-col rounded-3xl border bg-card p-4 transition-shadow",
        fresh ? "border-hh-orange shadow-[0_12px_30px_-18px_rgba(255,138,0,0.7)]" : "border-border",
      )}
    >
      <header className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">{icon}</span>
        <h3 className="flex-1 text-lg font-bold">{title}</h3>
        {fresh && (
          <span className="rounded-full bg-hh-orange px-2 py-0.5 text-[11px] font-bold text-hh-ink">Updated</span>
        )}
      </header>
      <p className="tabular mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <ShoppingBag className="size-3" aria-hidden /> {count} item{count === 1 ? "" : "s"} · {ago(latest, now)}
      </p>

      <div className="mt-3 flex-1 space-y-3">
        {guests.map((g, i) => (
          <div key={g.id} className={cn(guests.length > 1 && "rounded-2xl bg-muted/60 p-3")}>
            {guests.length > 1 && (
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>
                  Guest {i + 1} · {ago(g.updatedAt, now)}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => clear([g.id], `Guest ${i + 1}'s list`)}
                  className="rounded-full px-2 py-0.5 hover:bg-background hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}
            <ul className="space-y-1.5">
              {g.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="tabular w-7 shrink-0 font-bold text-brand-text">{it.quantity}×</span>
                  <span className="min-w-0">
                    <span className="font-medium">{it.name}</span>
                    {it.addOns.length > 0 && (
                      <span className="block text-xs text-muted-foreground">+ {it.addOns.map((a) => a.name).join(", ")}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        className="mt-4 self-start rounded-full"
        onClick={() => clear(guests.map((g) => g.id), title)}
      >
        <Trash2 data-icon="inline-start" /> Clear {guests.length > 1 ? "all" : "list"}
      </Button>
    </article>
  );
}
