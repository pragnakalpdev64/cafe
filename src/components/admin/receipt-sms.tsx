"use client";

import { Copy, LoaderCircle, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type ReceiptSms, receiptSms } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";

/**
 * Offers to text the guest their receipt from this phone's own messages app (free, from the
 * café's number). Nothing is sent until staff press Send in the messages app.
 */
export function ReceiptSmsDialog({
  bill,
  onClose,
}: {
  bill: { id: string; number: number } | null;
  onClose: () => void;
}) {
  // the result is kept with its bill id, so a different bill shows "Preparing…" until its own arrives
  const [result, setResult] = useState<{ id: string; sms: ReceiptSms } | null>(null);
  const sms = bill && result?.id === bill.id ? result.sms : null;

  useEffect(() => {
    if (!bill) return;
    let live = true;
    void receiptSms(bill.id).then((r) => live && setResult({ id: bill.id, sms: r }));
    return () => {
      live = false;
    };
  }, [bill]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.error("Couldn't copy – select the text and copy it instead.");
    }
  };

  return (
    <Dialog open={!!bill} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Text the receipt for bill #{bill?.number}?</DialogTitle>
        <DialogDescription>
          Opens the messages app on this phone or tablet with everything filled in. Press Send there.
        </DialogDescription>
        {!sms ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Preparing the message…
          </p>
        ) : !sms.ok ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {sms.error}
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              To <span className="tabular font-semibold">{sms.to}</span>
            </p>
            <p className="rounded-2xl bg-secondary px-3 py-2 text-secondary-foreground select-all">
              {sms.text}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {sms?.ok ? "Skip" : "Close"}
          </Button>
          {sms?.ok && (
            <>
              <Button variant="ghost" onClick={() => void copy(sms.text)}>
                <Copy data-icon="inline-start" /> Copy
              </Button>
              <Button asChild className="bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light">
                <a href={sms.href} onClick={() => setTimeout(onClose, 300)}>
                  <MessageSquareText data-icon="inline-start" /> Open messages
                </a>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Text receipt" for a paid bill, e.g. in order history. */
export function TextReceiptButton({ bill }: { bill: { id: string; number: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
        <MessageSquareText data-icon="inline-start" /> Text receipt
      </Button>
      <ReceiptSmsDialog bill={open ? bill : null} onClose={() => setOpen(false)} />
    </>
  );
}
