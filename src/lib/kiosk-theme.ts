import { applyTheme } from "@/lib/apply-theme";
import type { ThemeName } from "@/lib/themes";

/** Simple appearance modes for the kiosk dark/light toggle. */
export type KioskAppearance = "light" | "dark" | "system";

export const SUPLI_THEME_STORAGE_KEY = "supli-theme";

/** Map kiosk appearance to the app's named theme (day/night/system). */
export function appearanceToThemeName(
  appearance: KioskAppearance
): Extract<ThemeName, "day" | "night" | "system"> {
  if (appearance === "light") return "day";
  if (appearance === "dark") return "night";
  return "system";
}

/** next-themes setTheme() value for a kiosk appearance. */
export function appearanceToNextTheme(
  appearance: KioskAppearance
): "light" | "dark" | "system" {
  return appearance;
}

/**
 * Toggle between explicit light and dark based on the currently resolved
 * (visible) theme. Once the user picks, we stop following system.
 */
export function nextKioskAppearance(
  resolved: "light" | "dark" | undefined
): Exclude<KioskAppearance, "system"> {
  return resolved === "dark" ? "light" : "dark";
}

/**
 * Persist the kiosk appearance into the shared `supli-theme` key and apply
 * matching CSS variables via data-theme. Keeps the kiosk in sync with the
 * rest of the app's theme mechanism on this device.
 */
export function persistKioskAppearance(appearance: KioskAppearance): void {
  if (typeof window === "undefined") return;
  const themeName = appearanceToThemeName(appearance);
  localStorage.setItem(SUPLI_THEME_STORAGE_KEY, themeName);
  applyTheme(themeName);
}
