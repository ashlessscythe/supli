import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KIOSK_SHOW_IMAGES_DEFAULT,
  KIOSK_SHOW_IMAGES_STORAGE_KEY,
  parseKioskShowImages,
  persistKioskShowImages,
  readKioskShowImages,
} from "@/lib/kiosk-images";

describe("parseKioskShowImages", () => {
  it("defaults to images on", () => {
    expect(parseKioskShowImages(null)).toBe(KIOSK_SHOW_IMAGES_DEFAULT);
    expect(parseKioskShowImages(undefined)).toBe(true);
    expect(parseKioskShowImages("")).toBe(true);
  });

  it("parses on/off tokens", () => {
    expect(parseKioskShowImages("1")).toBe(true);
    expect(parseKioskShowImages("true")).toBe(true);
    expect(parseKioskShowImages("0")).toBe(false);
    expect(parseKioskShowImages("false")).toBe(false);
    expect(parseKioskShowImages("off")).toBe(false);
  });
});

describe("read/persistKioskShowImages", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("window", {
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reads back", () => {
    persistKioskShowImages(false);
    expect(store.get(KIOSK_SHOW_IMAGES_STORAGE_KEY)).toBe("0");
    expect(readKioskShowImages()).toBe(false);
    persistKioskShowImages(true);
    expect(readKioskShowImages()).toBe(true);
  });
});

describe("kiosk images toggle wiring", () => {
  it("lives in shared chrome next to theme/Exit, not on the left", () => {
    const client = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    expect(client).toContain("KioskImagesToggle");
    expect(client).toContain("data-kiosk-chrome");
    expect(client).toMatch(
      /data-kiosk-chrome[\s\S]*KioskImagesToggle[\s\S]*KioskThemeToggle/
    );
    expect(client).not.toMatch(/KioskImagesToggle[\s\S]*absolute left-4/);
    expect(client).not.toMatch(/absolute left-4[\s\S]*KioskImagesToggle/);
  });

  it("reserves wider header padding so Back/title clear the chrome", () => {
    const touch = readFileSync("src/app/kiosk/touch-flow.tsx", "utf8");
    expect(touch).toContain("pr-[12.5rem]");
    expect(touch).toContain("sm:pr-[14.5rem]");
  });

  it("tiles and scan confirm respect showImage / showImages", () => {
    const tile = readFileSync("src/app/kiosk/supply-tile.tsx", "utf8");
    const scan = readFileSync("src/app/kiosk/scan-flow.tsx", "utf8");
    const toggle = readFileSync(
      "src/app/kiosk/kiosk-images-toggle.tsx",
      "utf8"
    );
    expect(tile).toContain("showImage");
    expect(tile).toContain("{showImage && (");
    expect(scan).toContain("useKioskShowImages");
    expect(scan).toContain("showImages && itemId");
    expect(toggle).toContain('tabIndex={-1}');
    expect(toggle).toContain("onMouseDown");
    expect(toggle).toContain("onPointerDown");
    expect(toggle).toContain("min-h-12");
    expect(toggle).toContain("Hide item images");
    expect(toggle).toContain("Show item images");
  });
});
