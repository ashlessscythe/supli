import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";

const applyTheme = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apply-theme", () => ({
  applyTheme,
}));

import {
  appearanceToNextTheme,
  appearanceToThemeName,
  nextKioskAppearance,
  persistKioskAppearance,
  SUPLI_THEME_STORAGE_KEY,
} from "@/lib/kiosk-theme";

describe("kiosk appearance helpers", () => {
  it("maps light/dark/system to day/night/system theme names", () => {
    expect(appearanceToThemeName("light")).toBe("day");
    expect(appearanceToThemeName("dark")).toBe("night");
    expect(appearanceToThemeName("system")).toBe("system");
  });

  it("maps appearance to next-themes values", () => {
    expect(appearanceToNextTheme("light")).toBe("light");
    expect(appearanceToNextTheme("dark")).toBe("dark");
    expect(appearanceToNextTheme("system")).toBe("system");
  });

  it("toggles to the opposite of the resolved theme", () => {
    expect(nextKioskAppearance("dark")).toBe("light");
    expect(nextKioskAppearance("light")).toBe("dark");
    // Unknown/undefined → prefer dark (first explicit pick from light-looking UI)
    expect(nextKioskAppearance(undefined)).toBe("dark");
  });
});

describe("persistKioskAppearance", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    applyTheme.mockClear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes day/night to the shared supli-theme key and applies theme", () => {
    persistKioskAppearance("light");
    expect(store.get(SUPLI_THEME_STORAGE_KEY)).toBe("day");
    expect(applyTheme).toHaveBeenCalledWith("day");

    persistKioskAppearance("dark");
    expect(store.get(SUPLI_THEME_STORAGE_KEY)).toBe("night");
    expect(applyTheme).toHaveBeenCalledWith("night");
  });

  it("persists system and asks applyTheme to clear data-theme", () => {
    persistKioskAppearance("system");
    expect(store.get(SUPLI_THEME_STORAGE_KEY)).toBe("system");
    expect(applyTheme).toHaveBeenCalledWith("system");
  });
});

describe("kiosk theme toggle wiring", () => {
  it("renders the toggle on login and authenticated kiosk shell", () => {
    const login = readFileSync("src/app/kiosk/login/page.tsx", "utf8");
    const client = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    const toggle = readFileSync("src/app/kiosk/kiosk-theme-toggle.tsx", "utf8");

    expect(login).toContain("KioskThemeToggle");
    expect(client).toContain("KioskThemeToggle");
    expect(toggle).toContain("useTheme");
    expect(toggle).toContain("persistKioskAppearance");
    expect(toggle).toContain("tabIndex={-1}");
    expect(toggle).toContain("onMouseDown");
    expect(toggle).toContain("onPointerDown");
    expect(toggle).toContain("e.preventDefault()");
  });

  it("does not put localStorage in mode/scan/touch flow modules", () => {
    // Theme persistence lives in the shared helper + toggle, not mode state.
    for (const file of [
      "src/app/kiosk/kiosk-client.tsx",
      "src/app/kiosk/mode-select.tsx",
      "src/app/kiosk/scan-flow.tsx",
      "src/app/kiosk/touch-flow.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/localStorage/);
    }
  });

  it("scan flow still uses idle scan focus (no autofocus regression)", () => {
    const src = readFileSync("src/app/kiosk/scan-flow.tsx", "utf8");
    expect(src).toContain("useKioskScanFocus");
    expect(src).not.toContain("KioskThemeToggle");
  });
});
