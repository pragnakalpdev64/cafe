"use client";

import { LoaderCircle, LockOpen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  closeDay,
  deleteExpense,
  reopenDay,
  saveExpense,
  setOpeningCash,
} from "@/app/admin/(dashboard)/cash/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormAction } from "@/hooks/use-form-action";
import { compareCount } from "@/lib/cash";
import { EXPENSE_CATEGORY, EXPENSE_PAYMENT } from "@/lib/expenses";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

const rupees = (paise: number) => formatINR(toRupees(paise));
/** What the person typed, as paise – or null while it isn't a number yet. */
const typedPaise = (v: string) => {
  const n = Number(v.replace(/[₹,\s]/g, ""));
  return v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

function useToast(state: { ok?: boolean; error?: string } | undefined, success: string, onOk?: () => void) {
  useEffect(() => {
    if (state?.ok) {
      toast.success(success);
      onOk?.();
    } else if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function OpeningForm({ currentPaise, entered }: { currentPaise: number; entered: boolean }) {
  const [state, onSubmit, pending] = useFormAction(setOpeningCash, undefined);
  useToast(state, "Opening cash saved");
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 self-start">
      <div className="min-w-0 flex-1 basis-40">
        <FormField
          id="opening"
          label={entered ? "Change opening cash" : "Count the drawer and enter the opening cash"}
          error={state?.fieldErrors?.amount}
        >
          <Input
            id="opening"
            name="amount"
            inputMode="decimal"
            placeholder={String(toRupees(currentPaise))}
            className="h-10"
            required
            aria-invalid={!!state?.fieldErrors?.amount}
          />
        </FormField>
      </div>
      <Button type="submit" variant="outline" className="h-10 rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Save opening cash
      </Button>
    </form>
  );
}

export function CloseDayForm({ expectedPaise }: { expectedPaise: number }) {
  const [state, onSubmit, pending] = useFormAction(closeDay, undefined);
  const [counted, setCounted] = useState("");
  useToast(state, "Day closed – counts saved");
  const typed = typedPaise(counted);
  const result = typed === null ? null : compareCount(typed, expectedPaise);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormField
        id="counted"
        label="Count the cash in the drawer"
        hint={`The app expects ${rupees(expectedPaise)}.`}
        error={state?.fieldErrors?.counted}
      >
        <Input
          id="counted"
          name="counted"
          inputMode="decimal"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          className="h-11 text-lg"
          required
          aria-invalid={!!state?.fieldErrors?.counted}
        />
      </FormField>
      {result && (
        <p
          role="status"
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-semibold",
            result.kind === "match" && "bg-secondary text-secondary-foreground",
            result.kind === "short" && "bg-destructive/10 text-destructive",
            result.kind === "extra" && "bg-accent text-accent-foreground",
          )}
        >
          {result.kind === "match"
            ? "Matches – the drawer is right."
            : result.kind === "short"
              ? `Short by ${rupees(result.paise)}`
              : `Extra ${rupees(result.paise)} in the drawer`}
        </p>
      )}
      <FormField id="close-note" label="Note (optional)" error={state?.fieldErrors?.note}>
        <Input
          id="close-note"
          name="note"
          maxLength={200}
          placeholder="e.g. ₹100 given as change from my wallet"
          className="h-10"
        />
      </FormField>
      <Button
        type="submit"
        disabled={pending || typed === null}
        className="h-11 w-full rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
      >
        {pending && <LoaderCircle className="animate-spin" aria-hidden />}
        Close the day
      </Button>
    </form>
  );
}

export function ReopenDayButton({ day }: { day: string }) {
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      className="rounded-full"
      title="Reopen today?"
      description="The closing count is cleared and the day uses live totals again, so it can be counted and closed once more."
      confirmLabel="Reopen"
      onConfirm={() => reopenDay(day)}
      onDone={() => toast.success("Day reopened")}
    >
      <LockOpen data-icon="inline-start" /> Reopen
    </ConfirmButton>
  );
}

export type EditableExpense = {
  id: string;
  day: string;
  amountPaise: number;
  category: keyof typeof EXPENSE_CATEGORY;
  paidWith: keyof typeof EXPENSE_PAYMENT;
  paidTo: string | null;
  note: string | null;
};

/** Add an expense (staff: today only), or edit one (owner). */
export function ExpenseForm({
  owner,
  today,
  expense,
  onDone,
}: {
  owner: boolean;
  today: string;
  expense?: EditableExpense;
  onDone?: () => void;
}) {
  const [state, onSubmit, pending] = useFormAction(saveExpense, undefined);
  const [formKey, setFormKey] = useState(0);
  const err = state?.fieldErrors ?? {};
  useToast(state, expense ? "Expense saved" : "Expense added", () => {
    if (!expense) setFormKey((k) => k + 1); // clear the form for the next one
    onDone?.();
  });
  const p = expense ? `e-${expense.id}-` : "e-new-";
  return (
    <form key={formKey} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <FormField id={`${p}amount`} label="Amount (₹)" error={err.amount}>
        <Input
          id={`${p}amount`}
          name="amount"
          inputMode="decimal"
          defaultValue={expense ? String(toRupees(expense.amountPaise)) : ""}
          className="h-10"
          required
          aria-invalid={!!err.amount}
        />
      </FormField>
      <FormField id={`${p}category`} label="What for" error={err.category}>
        <NativeSelect
          id={`${p}category`}
          name="category"
          defaultValue={expense?.category ?? ""}
          className="h-10"
          required
        >
          <option value="" disabled>
            Choose…
          </option>
          {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id={`${p}paidWith`} label="Paid with" error={err.paidWith}>
        <NativeSelect
          id={`${p}paidWith`}
          name="paidWith"
          defaultValue={expense?.paidWith ?? "CASH"}
          className="h-10"
        >
          {Object.entries(EXPENSE_PAYMENT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id={`${p}paidTo`} label="Paid to (optional)" error={err.paidTo}>
        <Input
          id={`${p}paidTo`}
          name="paidTo"
          defaultValue={expense?.paidTo ?? ""}
          maxLength={80}
          placeholder="Vendor or person"
          className="h-10"
        />
      </FormField>
      {owner && (
        <FormField id={`${p}day`} label="Date" error={err.day}>
          <Input
            id={`${p}day`}
            name="day"
            type="date"
            max={today}
            defaultValue={expense?.day ?? today}
            className="h-10"
          />
        </FormField>
      )}
      <div className={owner ? "" : "sm:col-span-2"}>
        <FormField id={`${p}note`} label="Note (optional)" error={err.note}>
          <Input
            id={`${p}note`}
            name="note"
            defaultValue={expense?.note ?? ""}
            maxLength={200}
            placeholder="e.g. 5 kg tomatoes, 2 kg onions"
            className="h-10"
          />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" className="rounded-full" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {expense ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmButton
      size="icon-sm"
      variant="ghost"
      aria-label={`Delete ${label}`}
      title={`Delete ${label}?`}
      description="It's removed from expenses and reports. A day whose drawer is already closed keeps its saved totals."
      onConfirm={() => deleteExpense(id)}
      onDone={() => toast.success("Expense deleted")}
    >
      <Trash2 />
    </ConfirmButton>
  );
}
