"use client";

import { Check, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteCategory,
  moveCategory,
  saveCategory,
  setCategoryVisible,
} from "@/app/admin/(dashboard)/menu/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MoveButtons } from "@/components/admin/move-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminMenu } from "@/lib/data/admin-menu";

type Category = AdminMenu["categories"][number];

function CategoryNameForm({ category, onSaved }: { category?: Category; onSaved?: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(category ? "Category renamed" : "Category added");
      onSaved?.();
    } else if (state?.error) toast.error(state.fieldErrors?.name ?? state.error);
  }, [state, category, onSaved]);

  return (
    <form action={action} className="flex flex-1 items-center gap-2">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Input
        name="name"
        defaultValue={category?.name}
        placeholder={category ? undefined : "New category name"}
        aria-label={category ? `Name of ${category.name}` : "New category name"}
        aria-invalid={!!state?.fieldErrors?.name}
        required
        className="h-9 max-w-xs"
      />
      <Button type="submit" size="sm" variant={category ? "ghost" : "default"} disabled={pending}>
        {category ? <Check aria-hidden /> : null}
        {category ? <span className="sr-only">Save name</span> : "Add"}
      </Button>
    </form>
  );
}

export function CategoriesPanel({ categories }: { categories: Category[] }) {
  // remount the "new" form after each add so it clears
  const [formKey, setFormKey] = useState(0);
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {categories.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <CategoryNameForm category={c} />
            <span className="text-xs text-muted-foreground">{c.items.length} items</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{c.visible ? "Shown" : "Hidden"}</span>
              <ActionSwitch
                checked={c.visible}
                label={`Show ${c.name} on the menu`}
                action={(next) => setCategoryVisible(c.id, next)}
              />
            </div>
            <MoveButtons label={c.name} first={i === 0} last={i === categories.length - 1} move={(dir) => moveCategory(c.id, dir)} />
            <ConfirmButton
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${c.name}`}
              title={`Delete “${c.name}”?`}
              description="Only empty categories can be deleted."
              onConfirm={() => deleteCategory(c.id)}
              onDone={() => toast.success("Category deleted")}
            >
              <Trash2 />
            </ConfirmButton>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-dashed border-border p-3">
        <CategoryNameForm key={formKey} onSaved={() => setFormKey((k) => k + 1)} />
      </div>
    </div>
  );
}
