"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { applyTheme } from "@/lib/apply-theme";
import { cn } from "@/lib/utils";
import {
  appearanceToNextTheme,
  nextKioskAppearance,
  persistKioskAppearance,
  SUPLI_THEME_STORAGE_KEY,
} from "@/lib/kiosk-theme";
import { isValidTheme } from "@/lib/themes";

type KioskThemeToggleProps = {
  className?: string;
  /** Absolute positioning extras (e.g. top safe-area). */
  style?: CSSProperties;
};

/**
 * Touch-friendly dark/light toggle for kiosk screens.
 *
 * Uses the shared next-themes + `supli-theme` / applyTheme pipeline so the
 * choice persists on this device across reloads and PIN sessions. Defaults to
 * system until someone picks. Avoids stealing focus from the barcode field
 * (mousedown/pointerdown preventDefault) so scan autofocus is not regressed.
 */
export function KioskThemeToggle({ className, style }: KioskThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Re-apply named theme CSS vars after reload (ThemeSelector is not on kiosk).
    const stored = localStorage.getItem(SUPLI_THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) {
      applyTheme(stored);
    }
  }, []);

  function toggle() {
    const next = nextKioskAppearance(
      resolvedTheme === "dark" ? "dark" : "light"
    );
    persistKioskAppearance(next);
    setTheme(appearanceToNextTheme(next));
  }

  // Avoid hydration mismatch: icon depends on client-resolved theme.
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      // Not in tab order — barcode wedges need the scan input focused.
      tabIndex={-1}
      aria-label={label}
      title={label}
      onClick={toggle}
      // Keep barcode scan input focused (mousedown/pointerdown prevent focus).
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
      className={cn(
        "inline-flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-md",
        "text-muted-foreground touch-manipulation select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        className
      )}
      style={style}
    >
      {isDark ? (
        <Sun className="h-6 w-6" aria-hidden />
      ) : (
        <Moon className="h-6 w-6" aria-hidden />
      )}
    </button>
  );
}
