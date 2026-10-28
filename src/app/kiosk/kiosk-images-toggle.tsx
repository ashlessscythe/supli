"use client";

import { Image as ImageIcon, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKioskShowImages } from "@/hooks/use-kiosk-show-images";

type KioskImagesToggleProps = {
  className?: string;
};

/**
 * Show / Hide item images on the kiosk. Persists per device.
 * tabIndex={-1} + mousedown/pointerdown preventDefault so scan autofocus
 * is not stolen (same pattern as the theme toggle).
 */
export function KioskImagesToggle({ className }: KioskImagesToggleProps) {
  const { showImages, toggle, mounted } = useKioskShowImages();

  // Stable label before mount to avoid hydration flicker of the wrong icon.
  const showing = !mounted || showImages;
  const label = showing ? "Hide item images" : "Show item images";
  const short = showing ? "Hide" : "Show";

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={showing}
      title={label}
      onClick={toggle}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
      data-kiosk-images-toggle
      className={cn(
        "inline-flex h-12 min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-md px-2.5",
        "text-muted-foreground touch-manipulation select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        className
      )}
    >
      {showing ? (
        <ImageOff className="h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <ImageIcon className="h-5 w-5 shrink-0" aria-hidden />
      )}
      <span className="hidden text-sm font-medium sm:inline">{short}</span>
    </button>
  );
}
