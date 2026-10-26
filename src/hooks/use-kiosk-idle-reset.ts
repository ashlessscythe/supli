"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  KIOSK_IDLE_RESET_MS,
  KIOSK_IDLE_WARN_MS,
} from "@/lib/kiosk-constants";
import {
  idleResetSecondsRemaining,
  kioskIdlePhase,
  shouldIdleReset,
  shouldShowIdleWarning,
} from "@/lib/kiosk-idle";

export function useKioskIdleReset(
  enabled: boolean,
  onReset: () => void,
  options?: { warnMs?: number; resetMs?: number }
) {
  const warnMs = options?.warnMs ?? KIOSK_IDLE_WARN_MS;
  const resetMs = options?.resetMs ?? KIOSK_IDLE_RESET_MS;
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const resetFiredRef = useRef(false);
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  const bump = useCallback(() => {
    setLastActivityAt(Date.now());
    resetFiredRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetFiredRef.current = false;
      return;
    }
    bump();
  }, [enabled, bump]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onActivity = () => bump();
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });

    const tick = window.setInterval(() => setNow(Date.now()), 250);

    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.clearInterval(tick);
    };
  }, [enabled, bump]);

  const phase = enabled
    ? kioskIdlePhase(lastActivityAt, now, warnMs, resetMs)
    : "active";

  useEffect(() => {
    if (!enabled) return;
    if (!shouldIdleReset(phase)) return;
    if (resetFiredRef.current) return;
    resetFiredRef.current = true;
    onResetRef.current();
  }, [enabled, phase]);

  return {
    showWarning: enabled && shouldShowIdleWarning(phase),
    secondsRemaining: idleResetSecondsRemaining(lastActivityAt, now, resetMs),
    keepGoing: bump,
  };
}
