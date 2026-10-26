"use client";

import { Scan, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type KioskModeChoice = "scan" | "touch";

type KioskModeSelectProps = {
  onSelect: (mode: KioskModeChoice) => void;
};

const modeButtonClassName = cn(
  // Plain button — shadcn Button size default applies sm:h-9/sm:min-h-9 at ≥640px,
  // which collapses these tall tiles between ~640–1000px wide.
  "flex w-full flex-col items-center justify-center gap-4 rounded-md border-2 border-input bg-background p-6 text-center shadow-sm",
  "min-h-[35dvh] landscape:min-h-[50dvh]",
  "whitespace-normal touch-manipulation select-none transition-colors",
  "hover:bg-accent hover:text-accent-foreground",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "active:scale-[0.98] motion-reduce:active:scale-100"
);

export function KioskModeSelect({ onSelect }: KioskModeSelectProps) {
  return (
    <div className="grid w-full max-w-4xl gap-4 portrait:grid-cols-1 landscape:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelect("scan")}
        className={modeButtonClassName}
      >
        <Scan className="h-16 w-16 shrink-0" aria-hidden />
        <span className="text-3xl font-semibold landscape:text-4xl">SCAN</span>
        <span className="text-sm font-normal text-muted-foreground">
          Barcode scanner or typed code
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelect("touch")}
        className={modeButtonClassName}
      >
        <LayoutGrid className="h-16 w-16 shrink-0" aria-hidden />
        <span className="text-3xl font-semibold landscape:text-4xl">TOUCH</span>
        <span className="text-sm font-normal text-muted-foreground">
          Browse and tap to build a cart
        </span>
      </button>
    </div>
  );
}
