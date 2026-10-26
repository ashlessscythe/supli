"use client";

import { Scan, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export type KioskModeChoice = "scan" | "touch";

type KioskModeSelectProps = {
  onSelect: (mode: KioskModeChoice) => void;
};

export function KioskModeSelect({ onSelect }: KioskModeSelectProps) {
  return (
    <div className="grid w-full max-w-4xl gap-4 portrait:grid-cols-1 landscape:grid-cols-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => onSelect("scan")}
        className="flex min-h-[35dvh] flex-col items-center justify-center gap-4 border-2 landscape:min-h-[50dvh] touch-manipulation select-none"
      >
        <Scan className="h-16 w-16" aria-hidden />
        <span className="text-3xl font-semibold landscape:text-4xl">SCAN</span>
        <span className="text-sm font-normal text-muted-foreground">
          Barcode scanner or typed code
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onSelect("touch")}
        className="flex min-h-[35dvh] flex-col items-center justify-center gap-4 border-2 landscape:min-h-[50dvh] touch-manipulation select-none"
      >
        <LayoutGrid className="h-16 w-16" aria-hidden />
        <span className="text-3xl font-semibold landscape:text-4xl">TOUCH</span>
        <span className="text-sm font-normal text-muted-foreground">
          Browse and tap to build a cart
        </span>
      </Button>
    </div>
  );
}
