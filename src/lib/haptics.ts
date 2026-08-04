"use client";

/**
 * Light haptic feedback when Vibration API is available.
 * No-ops on unsupported platforms / when reduced motion is preferred.
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    window.navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}
