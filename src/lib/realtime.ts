import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// Live updates: actions publish small events through Postgres NOTIFY; each server
// process keeps one LISTEN connection and fans events out to its open SSE streams.
// Works the same with one or several server processes.

const CHANNEL = "hh_events";

export type RealtimeEvent =
  /** a guest's live selection changed or was removed */
  | { type: "selection"; selectionId: string }
  /** an order was created or changed; `selectionId` is set when it came from a guest's selection */
  | { type: "order"; orderId: string; number: number; status: OrderStatus; selectionId?: string }
  /** the listener reconnected and may have missed events – screens should reload */
  | { type: "resync" };

/** How often the listener checks it still hears its own NOTIFY, and how long it waits. */
const HEALTH_EVERY_MS = 25_000;
const HEALTH_TIMEOUT_MS = 5_000;

type Listener = (event: RealtimeEvent) => void;

const g = globalThis as unknown as {
  hhRealtime?: {
    emitter: EventEmitter;
    client?: Client;
    connecting?: Promise<void>;
    retry?: NodeJS.Timeout;
    health?: NodeJS.Timeout;
    /** nonce of the health ping in flight */
    ping?: string;
  };
};
const state = (g.hhRealtime ??= { emitter: new EventEmitter().setMaxListeners(0) });

/**
 * Drop a broken (or silent) listener and keep trying while someone is listening. Events may have
 * been missed meanwhile, so open screens get a `resync` once it's back.
 */
function reconnect(client: Client) {
  if (state.client !== client) return;
  state.client = undefined;
  client.end().catch(() => {});
  if (state.emitter.listenerCount("event") > 0 && !state.retry) {
    state.retry = setTimeout(() => {
      state.retry = undefined;
      void ensureListener()
        .then(() => state.emitter.emit("event", { type: "resync" } satisfies RealtimeEvent))
        .catch(() => {});
    }, 2000);
  }
}

/**
 * A LISTEN connection can go quiet without an error (seen in development), which would freeze
 * every guest's order status. So the listener NOTIFYs itself now and then and reconnects if
 * the ping doesn't come back.
 */
function checkHealth() {
  const client = state.client;
  if (state.emitter.listenerCount("event") === 0) return;
  if (!client) {
    // an earlier reconnect failed (e.g. the database was down) – try again
    if (!state.connecting && !state.retry)
      void ensureListener()
        .then(() => state.emitter.emit("event", { type: "resync" } satisfies RealtimeEvent))
        .catch(() => {});
    return;
  }
  const nonce = Math.random().toString(36).slice(2);
  state.ping = nonce;
  client
    .query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify({ type: "__ping", nonce })])
    .catch(() => {});
  setTimeout(() => {
    if (state.ping !== nonce) return; // answered
    console.warn("realtime: listener went quiet – reconnecting");
    reconnect(client);
  }, HEALTH_TIMEOUT_MS);
}

async function connect() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    try {
      const event = JSON.parse(msg.payload) as RealtimeEvent | { type: "__ping"; nonce: string };
      if (event.type === "__ping") {
        if (state.ping === event.nonce) state.ping = undefined;
        return;
      }
      state.emitter.emit("event", event);
    } catch {
      // ignore malformed payloads
    }
  });
  const onBroken = () => reconnect(client);
  client.on("error", onBroken);
  client.on("end", onBroken);
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  state.client = client;
  state.health ??= setInterval(checkHealth, HEALTH_EVERY_MS);
}

function ensureListener() {
  if (state.client) return Promise.resolve();
  state.connecting ??= connect().finally(() => {
    state.connecting = undefined;
  });
  return state.connecting;
}

/** Tell every open live stream that something changed. Never throws – live updates are best-effort. */
export async function publish(event: RealtimeEvent) {
  try {
    await db.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(event)})`;
  } catch (e) {
    console.error("realtime publish failed", e);
  }
}

export async function subscribe(listener: Listener): Promise<() => void> {
  state.emitter.on("event", listener);
  await ensureListener();
  return () => state.emitter.off("event", listener);
}

/**
 * A Server-Sent Events response. `onOpen` may send an initial message; `filter` decides
 * which events reach this client and what they carry. Sends a heartbeat so proxies keep it open.
 */
export function sseResponse(
  signal: AbortSignal,
  options: {
    onOpen?: (send: (event: string, data: unknown) => void) => Promise<void> | void;
    filter: (event: RealtimeEvent) => { event: string; data: unknown } | null;
  },
) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const unsubscribe = await subscribe((e) => {
        const out = options.filter(e);
        if (out) send(out.event, out.data);
      });
      const heartbeat = setInterval(
        () => !closed && controller.enqueue(encoder.encode(": ping\n\n")),
        20_000,
      );
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };
      signal.addEventListener("abort", cleanup);
      // tell the browser to retry quickly if the connection drops
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      await options.onOpen?.(send);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // stop Caddy/nginx buffering the stream
      "X-Accel-Buffering": "no",
    },
  });
}
