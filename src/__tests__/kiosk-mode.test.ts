import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const modeFiles = [
  "src/app/kiosk/kiosk-client.tsx",
  "src/app/kiosk/mode-select.tsx",
  "src/app/kiosk/scan-flow.tsx",
  "src/app/kiosk/touch-flow.tsx",
];

function listPageRoutesUnder(dir: string, base = dir): string[] {
  const entries = readdirSync(dir);
  const pages: string[] = [];
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      pages.push(...listPageRoutesUnder(full, base));
    } else if (name === "page.tsx" || name === "page.ts" || name === "page.jsx") {
      pages.push(full.slice(base.length).replace(/^\//, "") || name);
    }
  }
  return pages.sort();
}

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

describe("kiosk single entry point", () => {
  it("only has page.tsx and login/ page routes under src/app/kiosk", () => {
    const pages = listPageRoutesUnder("src/app/kiosk");
    expect(pages).toEqual(["login/page.tsx", "page.tsx"]);
  });

  it("renders mode select, SCAN, and TOUCH as client state inside /kiosk", () => {
    const page = readFileSync("src/app/kiosk/page.tsx", "utf8");
    const client = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    expect(page).toContain("KioskClient");
    expect(page).toContain('redirect("/kiosk/login")');
    expect(client).toContain('mode === "select"');
    expect(client).toContain('mode === "scan"');
    expect(client).toContain('mode === "touch"');
    expect(client).toContain("KioskModeSelect");
    expect(client).toContain("KioskScanFlow");
    expect(client).toContain("KioskTouchFlow");
  });
});
