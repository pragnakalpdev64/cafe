import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/** Status colours always come with a text label (goal doc → Accessibility). */
export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  NEW: { label: "New", className: "bg-status-new/15 text-status-new" },
  ACCEPTED: { label: "Confirmed", className: "bg-status-accepted/15 text-status-accepted" },
  PREPARING: { label: "In kitchen", className: "bg-status-preparing/15 text-status-preparing" },
  READY: { label: "Ready", className: "bg-status-ready/15 text-status-ready" },
  SERVED: { label: "Served", className: "bg-status-done/15 text-status-done" },
  PAID: { label: "Paid", className: "bg-status-done/15 text-status-done" },
  CANCELLED: { label: "Cancelled", className: "bg-status-cancelled/15 text-status-cancelled" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
