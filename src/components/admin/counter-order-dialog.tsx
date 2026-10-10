"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCounterOrder } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicMenu } from "@/lib/data/menu";
import { cn } from "@/lib/utils";
import { INDIAN_MOBILE } from "@/lib/validators/phone";
import { type EditableLine, ItemLinesEditor } from "./item-lines-editor";

/** A walk-in guest orders at the counter; staff enter it here (name required, phone optional). */
export function CounterOrderDialog({
  open,
  menu,
  onClose,
  onCreated,
}: {
  open: boolean;
  menu: PublicMenu;
  onClose: () => void;
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* remounts each time it opens, so the form starts empty */}
        {open && <CounterOrderForm menu={menu} onClose={onClose} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

function CounterOrderForm({
  menu,
  onClose,
  onCreated,
}: {
  menu: PublicMenu;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [takeaway, setTakeaway] = useState(false);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<{ message: string; problems?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const phoneOk = phone === "" || INDIAN_MOBILE.test(phone);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createCounterOrder({
        takeaway,
        name,
        phone,
        note: note.trim() || undefined,
        items: lines.map((l) => ({
          itemId: l.itemId,
          addOnIds: l.addOns.map((a) => a.id),
          quantity: l.quantity,
        })),
      });
      if (res.ok) {
        toast.success(`Counter order #${res.number} – send it to the kitchen when ready`);
        onCreated();
        onClose();
      } else setError({ message: res.error, problems: res.problems });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <DialogTitle className="text-xl">New counter order</DialogTitle>
        <DialogDescription>For a guest ordering at the counter. It starts as accepted.</DialogDescription>
      </div>

      <div
        className="inline-flex rounded-full bg-muted p-1"
        role="radiogroup"
        aria-label="Dine-in or takeaway"
      >
        {[false, true].map((t) => (
          <button
            key={String(t)}
            type="button"
            role="radio"
            aria-checked={takeaway === t}
            onClick={() => setTakeaway(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              takeaway === t ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {t ? "Takeaway" : "Dine-in"}
          </button>
        ))}
      </div>

      <ItemLinesEditor lines={lines} onChange={setLines} menu={menu} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="co-name">Guest&apos;s name</Label>
          <Input
            id="co-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="co-phone">Mobile (optional)</Label>
          <Input
            id="co-phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            aria-invalid={!phoneOk && phone.length === 10}
            className="h-10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="co-note">Note to the kitchen (optional)</Label>
        <Textarea
          id="co-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Less spicy, no onion…"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error.message}</p>
          {error.problems && (
            <ul className="mt-1 list-disc pl-5">
              {error.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending || lines.length === 0 || name.trim().length < 2 || !phoneOk}
        className="h-11 w-full rounded-full bg-cta text-base font-bold text-cta-foreground hover:bg-hh-orange-light"
      >
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Create order
      </Button>
    </form>
  );
}
