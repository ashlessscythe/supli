import { describe, expect, it } from "vitest";
import {
  isAndroidDevice,
  isIOSDevice,
  isSafariBrowser,
  wasIosInstallDismissed,
} from "@/lib/pwa/detect";
import { IOS_INSTALL_DISMISS_MS } from "@/lib/pwa/constants";

describe("pwa device detection", () => {
  it("detects iPhone Safari", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isIOSDevice(ua)).toBe(true);
    expect(isAndroidDevice(ua)).toBe(false);
    expect(isSafariBrowser(ua)).toBe(true);
  });

  it("detects Android Chrome", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(isAndroidDevice(ua)).toBe(true);
    expect(isIOSDevice(ua)).toBe(false);
    expect(isSafariBrowser(ua)).toBe(false);
  });

  it("detects iPadOS reporting as Macintosh with touch", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(isIOSDevice(ua, 5)).toBe(true);
    expect(isIOSDevice(ua, 0)).toBe(false);
  });

  it("remembers iOS install dismissal for 30 days", () => {
    const now = Date.UTC(2026, 7, 4);
    expect(wasIosInstallDismissed(now, null, IOS_INSTALL_DISMISS_MS)).toBe(
      false
    );
    expect(
      wasIosInstallDismissed(now, now - IOS_INSTALL_DISMISS_MS + 1000)
    ).toBe(true);
    expect(
      wasIosInstallDismissed(now, now - IOS_INSTALL_DISMISS_MS - 1000)
    ).toBe(false);
  });
});
