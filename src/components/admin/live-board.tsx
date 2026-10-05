"use client";

import { BellRing, Bell, BellOff, Eye, Phone, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeSelection } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import type { LiveBoard as LiveBoardData, LiveSelection } from "@/lib/data/live";
import type { PublicMenu } from "@/lib/data/menu";
import { cn } from "@/lib/utils";
import { ConfirmOrderDialog } from "./confirm-order-dialog";
import { OrdersPanel } from "./orders-panel";

type Connection = "live" | "reconnecting";

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

/** Short two-tone chime for "a guest is ready" (Web Audio, no file to load). */
function chime(ctx: AudioContext) {
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

export function LiveBoard({ initial, menu }: { initial: LiveBoardData; menu: PublicMenu }) {
  const [data, setData] = useState(initial);
  const [connection, setConnection] = useState<Connection>("live");
  const [skew, setSkew] = useState(() => Date.now() - new Date(initial.serverTime).getTime());
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState<LiveSelection | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const knownReady = useRef(new Set(initial.selections.filter((s) => s.status === "READY").map((s) => s.id)));

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/live", { cache: "no-store" });
      if (res.status === 401) {
        // full navigation: this route clears the cookie, then sends the browser to login
        window.location.assign(new URL("/admin/session-ended", window.location.origin));
        return;
      }
      if (!res.ok) throw new Error();
      const next: LiveBoardData = await res.json();
      setData(next);
      setSkew(Date.now() - new Date(next.serverTime).getTime());
    } catch {
      setConnection("reconnecting");
    }
  }, []);

  // Live push: the stream pings on every change, then we fetch the latest board.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource("/api/admin/live/stream");
    source.addEventListener("change", () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 150); // several pings in a burst → one fetch
    });
    source.onopen = () => {
      setConnection("live");
      void refresh(); // catch up on anything missed while disconnected
    };
    source.onerror = () => setConnection("reconnecting");
    // safety net in case a proxy silently drops the stream
    const poll = setInterval(refresh, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      clearInterval(tick);
      source.close();
    };
  }, [refresh]);

  // Chime when a guest becomes ready.
  useEffect(() => {
    const ready = data.selections.filter((s) => s.status === "READY").map((s) => s.id);
    const fresh = ready.filter((id) => !knownReady.current.has(id));
    knownReady.current = new Set(ready);
    if (fresh.length > 0 && soundOn && audio.current) chime(audio.current);
  }, [data, soundOn]);

  const toggleSound = () => {
    // browsers only allow sound after a tap, so the first tap creates the audio context
    audio.current ??= new AudioContext();
    void audio.current.resume();
    if (!soundOn) chime(audio.current);
    setSoundOn((on) => !on);
  };

  const serverNow = now - skew;
  const ready = data.selections.filter((s) => s.status === "READY");
  const picking = data.selections.filter((s) => s.status === "SELECTING");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Live orders</h1>
          <p className="text-sm text-muted-foreground">
            See what guests pick as they pick it. When a guest taps Confirm, go to them, take their name and
            number, and confirm the order here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={soundOn ? "secondary" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={toggleSound}
          >
            {soundOn ? <Bell data-icon="inline-start" /> : <BellOff data-icon="inline-start" />}
            Sound {soundOn ? "on" : "off"}
          </Button>
          <span
            role="status"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              connection === "live"
                ? "bg-secondary text-secondary-foreground"
                : "bg-destructive/10 text-destructive",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                connection === "live" ? "animate-pulse bg-hh-green" : "bg-destructive",
              )}
            />
            {connection === "live" ? "Live" : "Reconnecting…"}
          </span>
        </div>
      </div>

      <section aria-labelledby="ready-h" className="space-y-3">
        <h2 id="ready-h" className="flex items-center gap-2 text-lg font-bold">
          <BellRing className="size-5 text-brand-text" aria-hidden /> Ready to confirm
          <span className="text-sm font-normal text-muted-foreground">{ready.length}</span>
        </h2>
        {ready.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Nobody is waiting. Tables appear here when the guest taps Confirm.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ready.map((s) => (
              <SelectionCard key={s.id} selection={s} now={serverNow} onConfirm={() => setConfirming(s)} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="picking-h" className="space-y-3">
        <h2 id="picking-h" className="flex items-center gap-2 text-lg font-bold">
          <Eye className="size-5 text-hh-green dark:text-hh-green-light" aria-hidden /> Selecting now
          <span className="text-sm font-normal text-muted-foreground">{picking.length}</span>
        </h2>
        {picking.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No one is picking right now.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {picking.map((s) => (
              <SelectionCard key={s.id} selection={s} now={serverNow} onConfirm={() => setConfirming(s)} />
            ))}
          </div>
        )}
      </section>

      <OrdersPanel orders={data.orders} bills={data.bills} menu={menu} onChanged={refresh} />

      <ConfirmOrderDialog
        selection={confirming}
        menu={menu}
        onClose={() => setConfirming(null)}
        onConfirmed={(number) => {
          toast.success(`Order #${number} confirmed`);
          setConfirming(null);
          void refresh();
        }}
      />
    </div>
  );
}

function SelectionCard({
  selection: s,
  now,
  onConfirm,
}: {
  selection: LiveSelection;
  now: number;
  onConfirm: () => void;
}) {
  const [pending, start] = useTransition();
  const isReady = s.status === "READY";
  const count = s.items.reduce((n, i) => n + i.quantity, 0);
  const title = s.table ? `Table ${s.table}` : `Takeaway · code ${s.code}`;

  return (
    <article
      className={cn(
        "flex flex-col rounded-3xl border bg-card p-4",
        isReady ? "border-hh-orange shadow-[0_12px_30px_-18px_rgba(255,138,0,0.8)]" : "border-border",
      )}
    >
      <header className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          {s.table ? <Users className="size-4" aria-hidden /> : <Phone className="size-4" aria-hidden />}
        </span>
        <h3 className="flex-1 text-lg font-bold">{title}</h3>
        {isReady ? (
          <span className="rounded-full bg-hh-orange px-2.5 py-0.5 text-xs font-bold text-hh-ink">Ready</span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-hh-green" /> Selecting
          </span>
        )}
      </header>
      <p className="mt-1 tabular text-xs text-muted-foreground">
        {count} item{count === 1 ? "" : "s"} ·{" "}
        {isReady && s.readyAt ? `ready ${ago(s.readyAt, now)}` : `updated ${ago(s.updatedAt, now)}`}
      </p>
      <ul className="mt-3 flex-1 space-y-1.5">
        {s.items.map((it, j) => (
          <li key={j} className="flex gap-2 text-sm">
            <span className="w-7 shrink-0 tabular font-bold text-brand-text">{it.quantity}×</span>
            <span className="min-w-0">
              <span className="font-medium">{it.name}</span>
              {it.addOns.length > 0 && (
                <span className="block text-xs text-muted-foreground">
                  + {it.addOns.map((a) => a.name).join(", ")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          className={cn(
            "rounded-full",
            isReady && "bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light",
          )}
          variant={isReady ? "default" : "outline"}
          onClick={onConfirm}
        >
          Confirm order
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Remove ${title}'s list`}
          disabled={pending}
          className="ml-auto"
          onClick={() =>
            start(async () => {
              const res = await removeSelection(s.id);
              if (!res.ok) toast.error(res.error);
            })
          }
        >
          <Trash2 />
        </Button>
      </div>
    </article>
  );
}
