"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

/** Switch that flips instantly and rolls back with a message if the server says no. */
export function ActionSwitch({
  checked,
  action,
  label,
  successMessage,
}: {
  checked: boolean;
  action: (next: boolean) => Promise<{ ok: true } | { error: string }>;
  label: string;
  successMessage?: (next: boolean) => string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [, start] = useTransition();
  return (
    <Switch
      checked={optimistic}
      aria-label={label}
      onCheckedChange={(next) =>
        start(async () => {
          setOptimistic(next);
          const res = await action(next);
          if ("error" in res) toast.error(res.error);
          else if (successMessage) toast.success(successMessage(next));
        })
      }
    />
  );
}
