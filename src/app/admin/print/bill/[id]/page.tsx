import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { mergeBillLines } from "@/lib/billing";
import { getCafeDetails } from "@/lib/data/menu";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { maskPhone } from "@/lib/phone-mask";
import { PrintButton } from "../../tables/print-button";

export const metadata: Metadata = { title: "Bill", robots: { index: false } };

const rupees = (paise: number) => formatINR(toRupees(paise));
const METHOD = { CASH: "Cash", UPI: "UPI", CARD: "Card" } as const;

/** Receipt-style bill: 80 mm wide (thermal printers) and fine on A4. Outside the dashboard layout. */
export default async function BillPage({ params }: PageProps<"/admin/print/bill/[id]">) {
  await requireUser();
  const { id } = await params;
  const [bill, cafe] = await Promise.all([
    db.bill.findUnique({
      where: { id },
      include: {
        table: { select: { label: true } },
        orders: { orderBy: { number: "asc" }, select: { number: true, items: true } },
        createdBy: { select: { name: true } },
      },
    }),
    getCafeDetails(),
  ]);
  if (!bill) notFound();

  const lines = mergeBillLines(
    bill.orders.flatMap((o) =>
      o.items.map((i) => ({
        itemName: i.itemName,
        unitPricePaise: i.unitPricePaise,
        quantity: i.quantity,
        addOns: i.addOns as { name: string }[],
      })),
    ),
  );
  const when = bill.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="min-h-svh bg-muted py-6 print:bg-white print:py-0">
      <style>{`@page { margin: 4mm; } @media print { html, body { background: #fff; } }`}</style>
      <div className="mx-auto mb-4 flex w-[80mm] justify-end print:hidden">
        <PrintButton />
      </div>
      <article className="mx-auto w-[80mm] bg-white px-[4mm] py-[5mm] font-mono text-[11px] leading-snug text-black shadow-lg print:shadow-none">
        <header className="text-center">
          <h1 className="font-sans text-base font-extrabold">{cafe.name}</h1>
          {cafe.tagline && <p>{cafe.tagline}</p>}
          {cafe.address && <p>{cafe.address}</p>}
          {cafe.phone && <p>Ph: {cafe.phone}</p>}
        </header>

        <div className="my-2 border-t border-dashed border-black" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-2">
          <dt>Bill</dt>
          <dd className="text-right font-bold">#{bill.number}</dd>
          <dt>Date</dt>
          <dd className="text-right">{when}</dd>
          <dt>{bill.table ? "Table" : "Order"}</dt>
          <dd className="text-right">{bill.table ? bill.table.label : "Takeaway"}</dd>
          <dt>Guest</dt>
          <dd className="text-right">
            {bill.customerName}
            {bill.customerPhone && ` · ${maskPhone(bill.customerPhone)}`}
          </dd>
          <dt>Orders</dt>
          <dd className="text-right">{bill.orders.map((o) => `#${o.number}`).join(", ")}</dd>
        </dl>

        <div className="my-2 border-t border-dashed border-black" />
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="font-bold">Item</th>
              <th className="w-[8mm] text-right font-bold">Qty</th>
              <th className="w-[14mm] text-right font-bold">Rate</th>
              <th className="w-[16mm] text-right font-bold">Amt</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5 pr-1">
                  {l.name}
                  {l.addOns.length > 0 && <span className="block text-[10px]">+ {l.addOns.join(", ")}</span>}
                </td>
                <td className="text-right">{l.quantity}</td>
                <td className="text-right">{toRupees(l.unitPricePaise)}</td>
                <td className="text-right">{toRupees(l.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-2 border-t border-dashed border-black" />
        <dl className="grid grid-cols-[1fr_auto] gap-x-2">
          <dt>Subtotal</dt>
          <dd className="text-right">{rupees(bill.subtotalPaise)}</dd>
          {bill.taxPaise > 0 && (
            <>
              <dt>Tax ({bill.taxBasisPoints / 100}%)</dt>
              <dd className="text-right">{rupees(bill.taxPaise)}</dd>
            </>
          )}
          <dt className="font-sans text-sm font-extrabold">Total</dt>
          <dd className="font-sans text-sm font-extrabold">{rupees(bill.totalPaise)}</dd>
        </dl>

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center font-bold">
          {bill.paidAt
            ? `PAID · ${METHOD[bill.paymentMethod ?? "CASH"]} · ${bill.paidAt.toLocaleTimeString("en-IN", { timeStyle: "short" })}`
            : "Please pay at the counter"}
        </p>
        <p className="mt-2 text-center">Thank you! Eat well, live well.</p>
        {bill.createdBy && <p className="mt-1 text-center text-[9px]">Billed by {bill.createdBy.name}</p>}
      </article>
    </div>
  );
}
