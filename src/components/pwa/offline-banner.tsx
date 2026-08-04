"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Subtle banner when the browser reports offline status. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className={cn(
        "border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
      )}
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        You&apos;re offline. Cached pages still work; changes will sync when
        you reconnect.
      </span>
    </div>
  );
}
