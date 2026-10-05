import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";
import { db } from "@/lib/db";

// Live updates: actions publish small events through Postgres NOTIFY; each server
// process keeps one LISTEN connection and fans events out to its open SSE streams.
// Works the same with one or several server processes.

const CHANNEL = "hh_events";

export type RealtimeEvent =
  /** a guest's live selection changed, became ready, or was removed */
  | { type: "selection"; selectionId: string }
  /** an order was created or changed; `selectionId` is set when it came from a guest's selection */
  | { type: "order"; orderId: string; number: number; selectionId?: string };

type Listener = (event: RealtimeEvent) => void;

const g = globalThis as unknown as {
  hhRealtime?: { emitter: EventEmitter; client?: Client; connecting?: Promise<void>; retry?: NodeJS.Timeout };
};
const state = (g.hhRealtime ??= { emitter: new EventEmitter().setMaxListeners(0) });

async function connect() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const reconnect = () => {
    if (state.client !== client) return;
    state.client = undefined;
    client.end().catch(() => {});
    // keep trying while someone is listening
    if (state.emitter.listenerCount("event") > 0 && !state.retry) {
      state.retry = setTimeout(() => {
        state.retry = undefined;
        void ensureListener().catch(() => {});
      }, 2000);
    }
  };
  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    try {
      state.emitter.emit("event", JSON.parse(msg.payload) as RealtimeEvent);
    } catch {
      // ignore malformed payloads
    }
  });
  client.on("error", reconnect);
  client.on("end", reconnect);
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  state.client = client;
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
