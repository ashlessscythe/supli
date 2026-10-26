import {
  KIOSK_IDLE_RESET_MS,
  KIOSK_IDLE_WARN_MS,
} from "@/lib/kiosk-constants";

export type KioskIdlePhase = "active" | "warn" | "reset";

export function idleElapsedMs(lastActivityAt: number, now: number): number {
  return Math.max(0, now - lastActivityAt);
}

export function kioskIdlePhase(
  lastActivityAt: number,
  now: number,
  warnMs = KIOSK_IDLE_WARN_MS,
  resetMs = KIOSK_IDLE_RESET_MS
): KioskIdlePhase {
  const elapsed = idleElapsedMs(lastActivityAt, now);
  if (elapsed >= resetMs) return "reset";
  if (elapsed >= warnMs) return "warn";
  return "active";
}

/** Whole seconds remaining until reset (ceil), for the warning countdown. */
export function idleResetSecondsRemaining(
  lastActivityAt: number,
  now: number,
  resetMs = KIOSK_IDLE_RESET_MS
): number {
  const remaining = resetMs - idleElapsedMs(lastActivityAt, now);
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function shouldShowIdleWarning(phase: KioskIdlePhase): boolean {
  return phase === "warn";
}

export function shouldIdleReset(phase: KioskIdlePhase): boolean {
  return phase === "reset";
}
