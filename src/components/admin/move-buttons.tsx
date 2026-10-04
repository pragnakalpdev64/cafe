"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function MoveButtons({
  label,
  first,
  last,
  move,
}: {
  label: string;
  first: boolean;
  last: boolean;
  move: (dir: "up" | "down") => Promise<{ ok: true } | { error: string }>;
}) {
  const [pending, start] = useTransition();
  const run = (dir: "up" | "down") =>
    start(async () => {
      const res = await move(dir);
      if ("error" in res) toast.error(res.error);
    });
  return (
    <div className="flex">
      <Button variant="ghost" size="icon-sm" disabled={first || pending} onClick={() => run("up")} aria-label={`Move ${label} up`}>
        <ChevronUp />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={last || pending} onClick={() => run("down")} aria-label={`Move ${label} down`}>
        <ChevronDown />
      </Button>
    </div>
  );
}
