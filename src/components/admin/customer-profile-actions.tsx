"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  deleteCustomer,
  saveCustomerNotes,
  withdrawConsent,
} from "@/app/admin/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { ConfirmButton } from "./confirm-button";

export function CustomerNotesForm({ id, notes }: { id: string; notes: string | null }) {
  const [state, onSubmit, pending] = useFormAction(saveCustomerNotes, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Notes saved");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <Textarea
        name="notes"
        aria-label="Staff notes"
        defaultValue={notes ?? ""}
        maxLength={1000}
        rows={3}
        placeholder="Allergies, favourite table, likes extra chutney…"
        aria-invalid={!!state?.fieldErrors?.notes}
      />
      <Button type="submit" size="sm" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Save notes
      </Button>
    </form>
  );
}

export function StopOffersButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmButton
      size="sm"
      variant="outline"
      className="rounded-full"
      title={`Stop offers for ${name}?`}
      description="They won't get offers on WhatsApp or SMS any more. Only the guest can opt in again, by ticking the box on their next order."
      confirmLabel="Stop offers"
      onConfirm={() => withdrawConsent(id)}
      onDone={() => toast.success("Offers stopped")}
    >
      Stop offers
    </ConfirmButton>
  );
}

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      className="rounded-full text-destructive"
      title={`Delete ${name}'s data?`}
      description="Use this when the guest asks. Their name, number, notes and visit history are removed for good. Old orders and bills keep their amounts but show “Deleted on request”. This can't be undone."
      confirmLabel="Delete data"
      onConfirm={() => deleteCustomer(id)}
      onDone={() => {
        toast.success("Customer data deleted");
        router.replace("/admin/customers");
      }}
    >
      <Trash2 data-icon="inline-start" /> Delete data
    </ConfirmButton>
  );
}
