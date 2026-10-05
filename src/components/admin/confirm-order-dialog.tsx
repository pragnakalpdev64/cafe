"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { confirmSelection, lookupCustomer } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LiveSelection } from "@/lib/data/live";
import type { PublicMenu } from "@/lib/data/menu";
import { INDIAN_MOBILE } from "@/lib/validators/phone";
import { ItemLinesEditor, toEditableLines } from "./item-lines-editor";

type Props = {
  selection: LiveSelection | null;
  menu: PublicMenu;
  onClose: () => void;
  onConfirmed: (number: number) => void;
};

export function ConfirmOrderDialog({ selection, menu, onClose, onConfirmed }: Props) {
  return (
    <Dialog open={!!selection} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* keyed so each guest starts with a fresh form */}
        {selection && (
          <ConfirmForm key={selection.id} selection={selection} menu={menu} onConfirmed={onConfirmed} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmForm({
  selection,
  menu,
  onConfirmed,
}: {
  selection: LiveSelection;
  menu: PublicMenu;
  onConfirmed: (n: number) => void;
}) {
  const [items, setItems] = useState(() => toEditableLines(selection.items));
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [visits, setVisits] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ message: string; problems?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const phoneOk = INDIAN_MOBILE.test(phone);
  const title = selection.table ? `Table ${selection.table}` : `Takeaway · code ${selection.code}`;

  // Returning customer: fill in the name once a full number is typed.
  useEffect(() => {
    if (!phoneOk) return;
    let cancelled = false;
    void lookupCustomer(phone).then((res) => {
      if (cancelled) return;
      setVisits(res.name ? (res.visits ?? 0) : null);
      if (res.name) setName((current) => current || res.name!);
    });
    return () => {
      cancelled = true;
    };
  }, [phone, phoneOk]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await confirmSelection({
        selectionId: selection.id,
        name,
        phone,
        note: note || undefined,
        marketingConsent: consent,
        items: items.map((i) => ({
          itemId: i.itemId,
          addOnIds: i.addOns.map((a) => a.id),
          quantity: i.quantity,
        })),
      });
      if (res.ok) onConfirmed(res.number);
      else setError({ message: res.error, problems: res.problems });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <DialogTitle className="text-xl">Confirm order · {title}</DialogTitle>
        <DialogDescription>
          Check the items with the guest – change, remove or add – then add their name and number.
        </DialogDescription>
      </div>

      <ItemLinesEditor lines={items} onChange={setItems} menu={menu} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-phone">Guest&apos;s mobile</Label>
          <Input
            id="c-phone"
            inputMode="numeric"
            maxLength={10}
            placeholder="98xxxxxx21"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            aria-invalid={phone.length === 10 && !phoneOk}
            required
            autoFocus
            className="h-10"
          />
          {visits !== null && (
            <p className="text-xs text-hh-green dark:text-hh-green-light">Returning guest</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Guest&apos;s name</Label>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={60}
            className="h-10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-note">Note to the kitchen (optional)</Label>
        <Textarea
          id="c-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Less spicy, no onion…"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
        <span>Guest agrees to receive offers on WhatsApp / SMS</span>
      </label>

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
        disabled={pending || !phoneOk || name.trim().length < 2 || items.length === 0}
        className="h-11 w-full rounded-full bg-cta text-base font-bold text-cta-foreground hover:bg-hh-orange-light"
      >
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Confirm order
      </Button>
    </form>
  );
}
