"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Clear "offline" warning for the counter tablet (goal doc → Reliability). */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-semibold text-white">
      <WifiOff className="size-4" aria-hidden /> Offline – changes won&apos;t save until the internet is back.
    </div>
  );
}
