import { z } from "zod";
import { db } from "@/lib/db";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const OrderIds = z.array(z.string().regex(/^[a-z0-9]{20,32}$/)).max(10);

/**
 * Live channel for one guest's phone. Knowing the device's random id (and its order ids) is the key.
 * Sends `confirmed` when the cashier turns the guest's list into an order, and `order`
 * whenever one of the guest's orders changes status.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const cid = z.uuid().safeParse(params.get("cid"));
  const orderIds = OrderIds.safeParse((params.get("orders") ?? "").split(",").filter(Boolean));
  if (!cid.success || !orderIds.success) return new Response("Bad request", { status: 400 });
  const selectionId = cid.data;
  const watched = new Set(orderIds.data);

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
    filter: (e) => {
      if (e.type !== "order") return null;
      if (e.selectionId === selectionId) {
        watched.add(e.orderId);
        return { event: "confirmed", data: { orderId: e.orderId, number: e.number } };
      }
      return watched.has(e.orderId)
        ? { event: "order", data: { orderId: e.orderId, status: e.status } }
        : null;
    },
  });
}
