"use client";

import { ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteMenuItem, saveMenuItem } from "@/app/admin/(dashboard)/menu/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EditableMenuItem } from "@/lib/data/admin-menu";
import { formatINR } from "@/lib/format";
import { HIGH_PROTEIN_MIN_G } from "@/lib/menu-types";
import { useFormAction } from "@/hooks/use-form-action";

type Props = {
  item?: EditableMenuItem;
  categories: { id: string; name: string }[];
  addOns: { id: string; name: string; price: number }[];
  defaultCategoryId?: string;
};

export function ItemForm({ item, categories, addOns, defaultCategoryId }: Props) {
  const router = useRouter();
  const [state, onSubmit, pending] = useFormAction(saveMenuItem, undefined);
  const [preview, setPreview] = useState<string | undefined>(item?.photo);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [protein, setProtein] = useState(item?.protein ?? 0);
  const err = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="removePhoto" value={removePhoto ? "true" : "false"} />

      <div className="space-y-5 rounded-3xl border border-border bg-card p-5">
        <Field id="name" label="Name" error={err.name}>
          <Input
            id="name"
            name="name"
            defaultValue={item?.name}
            required
            className="h-10"
            aria-invalid={!!err.name}
          />
        </Field>

        <Field id="categoryId" label="Category" error={err.categoryId}>
          <NativeSelect
            id="categoryId"
            name="categoryId"
            defaultValue={item?.categoryId ?? defaultCategoryId ?? categories[0]?.id}
            className="h-10"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field
          id="description"
          label="Short description"
          hint="One line shown on the menu card."
          error={err.description}
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={item?.description}
            maxLength={240}
            rows={2}
          />
        </Field>

        <Field id="ingredients" label="Ingredients" hint="Separate with commas." error={err.ingredients}>
          <Textarea
            id="ingredients"
            name="ingredients"
            defaultValue={item?.ingredients.join(", ")}
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field id="price" label="Price (₹)" error={err.price}>
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              defaultValue={item?.price}
              required
              className="h-10"
              aria-invalid={!!err.price}
            />
          </Field>
          <Field id="protein" label="Protein (g)" error={err.protein}>
            <Input
              id="protein"
              name="protein"
              inputMode="numeric"
              defaultValue={item?.protein ?? 0}
              onChange={(e) => setProtein(Number(e.target.value) || 0)}
              className="h-10"
              aria-invalid={!!err.protein}
            />
          </Field>
          <Field id="kcal" label="Calories (kcal)" error={err.kcal}>
            <Input
              id="kcal"
              name="kcal"
              inputMode="numeric"
              defaultValue={item?.kcal ?? 0}
              className="h-10"
              aria-invalid={!!err.kcal}
            />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          {protein >= HIGH_PROTEIN_MIN_G
            ? `Shows the “High protein” tag (${HIGH_PROTEIN_MIN_G} g or more).`
            : `Items with ${HIGH_PROTEIN_MIN_G} g protein or more get the “High protein” tag automatically.`}
        </p>

        {addOns.length > 0 && (
          <fieldset>
            <legend className="text-sm font-medium">Add-ons customers can pick</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {addOns.map((a) => (
                <label
                  key={a.id}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm"
                >
                  <Checkbox name="addOnIds" value={a.id} defaultChecked={item?.addOnIds.includes(a.id)} />
                  <span className="flex-1">{a.name}</span>
                  <span className="tabular text-xs text-muted-foreground">+{formatINR(a.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Photo</p>
          <div className="relative mt-2 aspect-square overflow-hidden rounded-2xl bg-muted">
            {preview && !removePhoto ? (
              <>
                {/* blob: previews can't go through the image optimiser */}
                {preview.startsWith("blob:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="size-full object-cover" />
                ) : (
                  <Image src={preview} alt="" fill sizes="280px" className="object-cover" />
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="absolute top-2 right-2 rounded-full"
                  aria-label="Remove photo"
                  onClick={() => {
                    setRemovePhoto(true);
                    setPreview(undefined);
                    const input = document.getElementById("photo") as HTMLInputElement | null;
                    if (input) input.value = "";
                  }}
                >
                  <X />
                </Button>
              </>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                <ImagePlus className="size-8" aria-hidden />
                No photo – the menu shows artwork instead
              </div>
            )}
          </div>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className="mt-3 h-10 py-2"
            aria-invalid={!!err.photo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setRemovePhoto(false);
                setPreview(URL.createObjectURL(f));
              }
            }}
          />
          {err.photo && <p className="mt-1 text-xs text-destructive">{err.photo}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG or WebP up to 8 MB. Shrunk automatically.
          </p>
        </div>

        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <SwitchRow
            name="available"
            label="Available"
            hint="Off = “Sold out” on the menu"
            defaultChecked={item?.available ?? true}
          />
          <SwitchRow
            name="visible"
            label="Show on menu"
            hint="Off = hidden completely"
            defaultChecked={item?.visible ?? true}
          />
          <SwitchRow
            name="isBestseller"
            label="Bestseller"
            hint="Tag + landing page strip"
            defaultChecked={item?.isBestseller ?? false}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={pending}
            className="h-11 flex-1 rounded-full text-base font-semibold"
          >
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            {item ? "Save changes" : "Add to menu"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={() => router.push("/admin/menu")}
          >
            Cancel
          </Button>
        </div>
        {item && (
          <ConfirmButton
            variant="destructive"
            className="w-full rounded-full"
            title={`Delete “${item.name}”?`}
            description="It disappears from the menu. Past bills keep its name and price. To hide it for a while instead, switch off “Show on menu”."
            onConfirm={() => deleteMenuItem(item.id)}
            onDone={() => {
              toast.success("Item deleted");
              router.push("/admin/menu");
            }}
          >
            <Trash2 data-icon="inline-start" /> Delete item
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function SwitchRow({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  const id = `switch-${name}`;
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        <span id={`${id}-hint`} className="block text-xs text-muted-foreground">
          {hint}
        </span>
      </label>
      <Switch id={id} name={name} defaultChecked={defaultChecked} aria-describedby={`${id}-hint`} />
    </div>
  );
}
