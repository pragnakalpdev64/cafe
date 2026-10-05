"use client";

import { Check, Plus, Printer, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteTable, saveTable, setTableActive } from "@/app/admin/(dashboard)/tables/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";

type Row = { id: string; label: string; seats: number; active: boolean; url: string; qr: string };

function TableForm({ table, onSaved }: { table?: Row; onSaved?: () => void }) {
  const [state, onSubmit, pending] = useFormAction(saveTable, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(table ? "Table saved" : "Table added");
      onSaved?.();
    } else if (state?.error) toast.error(state.error);
  }, [state, table, onSaved]);
  const err = state?.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      {table && <input type="hidden" name="id" value={table.id} />}
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Name
        <Input
          name="label"
          defaultValue={table?.label}
          placeholder={table ? undefined : "T7"}
          required
          aria-invalid={!!err.label}
          className="h-9 w-28 text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Seats
        <Input
          name="seats"
          inputMode="numeric"
          defaultValue={table?.seats ?? 4}
          required
          aria-invalid={!!err.seats}
          className="h-9 w-20 text-foreground"
        />
      </label>
      <Button
        type="submit"
        size="sm"
        variant={table ? "ghost" : "default"}
        disabled={pending}
        className="h-9"
      >
        {table ? <Check aria-hidden /> : <Plus data-icon="inline-start" />}
        {table ? <span className="sr-only">Save {table.label}</span> : "Add table"}
      </Button>
    </form>
  );
}

export function TablesManager({ tables, siteIsLocal }: { tables: Row[]; siteIsLocal: boolean }) {
  const [formKey, setFormKey] = useState(0);
  const activeCount = tables.filter((t) => t.active).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tables & QR</h1>
          <p className="text-sm text-muted-foreground">
            Each table has its own QR code. Renaming a table keeps its code, so printed cards keep working.
          </p>
        </div>
        <Button asChild className="rounded-full" disabled={activeCount === 0}>
          <Link href="/admin/print/tables" target="_blank">
            <Printer data-icon="inline-start" /> Print QR cards ({activeCount})
          </Link>
        </Button>
      </div>

      {siteIsLocal && (
        <p className="flex gap-2 rounded-2xl bg-accent p-4 text-sm text-accent-foreground" role="status">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-text" aria-hidden />
          These codes point to this computer (localhost), so guests&apos; phones can&apos;t open them. Print
          the cards after the site is live on its own domain.
        </p>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {tables.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
            <div
              className="size-16 shrink-0 rounded-lg bg-white p-1.5 [&_svg]:size-full"
              role="img"
              aria-label={`QR code for table ${t.label}`}
              dangerouslySetInnerHTML={{ __html: t.qr }}
            />
            <div className="min-w-0 flex-1">
              <TableForm table={t} />
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {t.url}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t.active ? "In use" : "Off"}</span>
              <ActionSwitch
                checked={t.active}
                label={`Table ${t.label} in use`}
                action={(next) => setTableActive(t.id, next)}
              />
            </div>
            <ConfirmButton
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove table ${t.label}`}
              title={`Remove table ${t.label}?`}
              description="Its QR code stops working. To pause a table instead, switch it off."
              confirmLabel="Remove"
              onConfirm={() => deleteTable(t.id)}
              onDone={() => toast.success("Table removed")}
            >
              <Trash2 />
            </ConfirmButton>
          </li>
        ))}
        {tables.length === 0 && (
          <li className="p-6 text-center text-muted-foreground">No tables yet. Add your first below.</li>
        )}
      </ul>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="mb-2 text-sm font-semibold">Add a table</p>
        <TableForm key={formKey} onSaved={() => setFormKey((k) => k + 1)} />
      </div>
    </div>
  );
}
