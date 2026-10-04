"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteAddOn, saveAddOn } from "@/app/admin/(dashboard)/menu/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminMenu } from "@/lib/data/admin-menu";
import { formatINR } from "@/lib/format";

type AddOn = AdminMenu["addOns"][number];

function AddOnForm({ addOn, onDone }: { addOn?: AddOn; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveAddOn, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(addOn ? "Add-on saved" : "Add-on added");
      onDone();
    }
  }, [state, addOn, onDone]);
  const err = state?.fieldErrors ?? {};
  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-start">
      {addOn && <input type="hidden" name="id" value={addOn.id} />}
      <Field label="Name" error={err.name} className="col-span-2 sm:col-span-1">
        <Input name="name" defaultValue={addOn?.name} required aria-invalid={!!err.name} className="h-9" />
      </Field>
      <Field label="Price ₹" error={err.price}>
        <Input name="price" inputMode="decimal" defaultValue={addOn?.price} required aria-invalid={!!err.price} className="h-9" />
      </Field>
      <Field label="Protein g" error={err.protein}>
        <Input name="protein" inputMode="numeric" defaultValue={addOn?.protein ?? 0} aria-invalid={!!err.protein} className="h-9" />
      </Field>
      <Field label="kcal" error={err.kcal}>
        <Input name="kcal" inputMode="numeric" defaultValue={addOn?.kcal ?? 0} aria-invalid={!!err.kcal} className="h-9" />
      </Field>
      <div className="col-span-2 flex gap-1 sm:col-span-1 sm:pt-5">
        <Button type="submit" size="sm" disabled={pending}>
          {addOn ? "Save" : "Add"}
        </Button>
        {addOn && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone} aria-label="Cancel editing">
            <X />
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}>
      {label}
      {children}
      {error && <span className="block text-destructive">{error}</span>}
    </label>
  );
}

export function AddOnsPanel({
  addOns,
  isOwner,
  setAvailable,
}: {
  addOns: AddOn[];
  isOwner: boolean;
  setAvailable: (id: string, next: boolean) => Promise<{ ok: true } | { error: string }>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {addOns.map((a) => (
          <li key={a.id} className="px-3 py-2.5">
            {editing === a.id ? (
              <AddOnForm addOn={a} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className={a.available ? "font-medium" : "font-medium text-muted-foreground line-through"}>{a.name}</p>
                  <p className="tabular text-xs text-muted-foreground">
                    +{formatINR(a.price)} · +{a.protein} g · {a.kcal} kcal · on {a.usedBy} item{a.usedBy === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">{a.available ? "Available" : "Sold out"}</span>
                <ActionSwitch
                  checked={a.available}
                  label={`${a.name} available`}
                  action={(next) => setAvailable(a.id, next)}
                />
                {isOwner && (
                  <>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${a.name}`} onClick={() => setEditing(a.id)}>
                      <Pencil />
                    </Button>
                    <ConfirmButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${a.name}`}
                      title={`Delete “${a.name}”?`}
                      description={`It will be removed from ${a.usedBy} item${a.usedBy === 1 ? "" : "s"}. Past orders keep it on their bills.`}
                      onConfirm={() => deleteAddOn(a.id)}
                      onDone={() => toast.success("Add-on deleted")}
                    >
                      <Trash2 />
                    </ConfirmButton>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <div className="rounded-2xl border border-dashed border-border p-3">
          <p className="mb-2 text-sm font-semibold">New add-on</p>
          <AddOnForm key={formKey} onDone={() => setFormKey((k) => k + 1)} />
        </div>
      )}
    </div>
  );
}
