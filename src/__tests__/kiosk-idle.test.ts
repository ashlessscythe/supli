import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  idleElapsedMs,
  idleResetSecondsRemaining,
  kioskIdlePhase,
  shouldIdleReset,
  shouldShowIdleWarning,
} from "@/lib/kiosk-idle";
import {
  KIOSK_IDLE_RESET_MS,
  KIOSK_IDLE_WARN_MS,
} from "@/lib/kiosk-constants";

describe("kiosk idle helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays active before the warn threshold", () => {
    const start = Date.now();
    vi.advanceTimersByTime(KIOSK_IDLE_WARN_MS - 1);
    const phase = kioskIdlePhase(start, Date.now());
    expect(phase).toBe("active");
    expect(shouldShowIdleWarning(phase)).toBe(false);
    expect(shouldIdleReset(phase)).toBe(false);
  });

  it("warns after KIOSK_IDLE_WARN_MS and resets after KIOSK_IDLE_RESET_MS", () => {
    expect(KIOSK_IDLE_WARN_MS).toBe(45_000);
    expect(KIOSK_IDLE_RESET_MS).toBe(60_000);

    const start = Date.now();
    vi.advanceTimersByTime(KIOSK_IDLE_WARN_MS);
    expect(kioskIdlePhase(start, Date.now())).toBe("warn");
    expect(idleResetSecondsRemaining(start, Date.now())).toBe(15);

    vi.advanceTimersByTime(KIOSK_IDLE_RESET_MS - KIOSK_IDLE_WARN_MS);
    const resetPhase = kioskIdlePhase(start, Date.now());
    expect(resetPhase).toBe("reset");
    expect(shouldIdleReset(resetPhase)).toBe(true);
  });

  it("activity resets the elapsed timer", () => {
    const t0 = Date.now();
    vi.advanceTimersByTime(40_000);
    expect(idleElapsedMs(t0, Date.now())).toBe(40_000);

    const bumped = Date.now();
    vi.advanceTimersByTime(10_000);
    expect(kioskIdlePhase(bumped, Date.now())).toBe("active");
    expect(idleElapsedMs(bumped, Date.now())).toBe(10_000);
  });
});
