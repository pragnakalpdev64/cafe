import { z } from "zod";
import { db } from "@/lib/db";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/**
 * Live channel for one guest's phone. Knowing the device's random id is the key.
 * Sends `confirmed` when the cashier turns the guest's list into an order.
 */
export async function GET(req: Request) {
  const cid = z.uuid().safeParse(new URL(req.url).searchParams.get("cid"));
  if (!cid.success) return new Response("Bad request", { status: 400 });
  const selectionId = cid.data;

  return sseResponse(req.signal, {
    async onOpen(send) {
      // catch up if the order was confirmed while this phone was offline
      const sel = await db.selection.findUnique({
        where: { id: selectionId },
        select: { status: true, orderId: true },
      });
      if (sel?.status === "CONFIRMED" && sel.orderId) {
        const order = await db.order.findUnique({
          where: { id: sel.orderId },
          select: { id: true, number: true },
        });
        if (order) send("confirmed", { orderId: order.id, number: order.number });
      }
    },
    filter: (e) =>
      e.type === "order" && e.selectionId === selectionId
        ? { event: "confirmed", data: { orderId: e.orderId, number: e.number } }
        : null,
  });
}
