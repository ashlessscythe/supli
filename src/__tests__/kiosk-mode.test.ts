import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const modeFiles = [
  "src/app/kiosk/kiosk-client.tsx",
  "src/app/kiosk/mode-select.tsx",
  "src/app/kiosk/scan-flow.tsx",
  "src/app/kiosk/touch-flow.tsx",
];

describe("kiosk mode persistence", () => {
  it("does not persist mode to localStorage, sessionStorage, or cookies", () => {
    for (const file of modeFiles) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/localStorage/);
      expect(src).not.toMatch(/sessionStorage/);
      expect(src).not.toMatch(/document\.cookie/);
      expect(src).not.toMatch(/cookies\(\)/);
    }
  });

  it("initializes mode state to select", () => {
    const src = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    expect(src).toMatch(/useState<KioskMode>\("select"\)/);
  });

  it("returns to mode select on TOUCH done", () => {
    const src = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    expect(src).toContain('onDone={() => setMode("select")}');
  });

  it("keeps SCAN looping after complete (does not call onBack on success)", () => {
    const src = readFileSync("src/app/kiosk/scan-flow.tsx", "utf8");
    expect(src).toContain("resetToScan()");
    expect(src).toContain("SCAN loops until Back or idle reset");
  });
});
