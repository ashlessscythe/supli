import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const KIOSK_ROOT = "src/app/kiosk";

function listTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listTsxFiles(full));
    } else if (full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * shadcn Button size default injects sm:h-9/sm:min-h-9. Unprefixed custom
 * min-h-/h- lose at ≥640px unless size="none" (or plain <button>).
 */
function offendingButtonUsages(src: string): string[] {
  const offenders: string[] = [];
  // Rough JSX Button open tags (single-line or multi-line up to closing >)
  const re = /<Button\b([\s\S]*?)>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const attrs = match[1];
    const hasCustomMinH =
      /\bmin-h-\[/.test(attrs) ||
      /\bmin-h-(?:\d+|\[)/.test(attrs) ||
      /\bh-(?:1[0-6]|\[)/.test(attrs);
    if (!hasCustomMinH) continue;
    const hasSizeNone = /\bsize=["']none["']/.test(attrs);
    const hasSmHeightOverride =
      /\bsm:h-/.test(attrs) || /\bsm:min-h-/.test(attrs);
    if (!hasSizeNone && !hasSmHeightOverride) {
      offenders.push(attrs.replace(/\s+/g, " ").trim().slice(0, 120));
    }
  }
  return offenders;
}

describe("kiosk Button height overrides", () => {
  const files = listTsxFiles(KIOSK_ROOT);

  it("lists kiosk tsx files", () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files).toContain("src/app/kiosk/mode-select.tsx");
  });

  it("does not combine shadcn Button custom heights without neutralizing sm: size", () => {
    const problems: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("@/components/ui/button")) continue;
      for (const attrs of offendingButtonUsages(src)) {
        problems.push(`${file}: <Button ${attrs}>`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("mode-select avoids Button entirely for tall tiles", () => {
    const src = readFileSync("src/app/kiosk/mode-select.tsx", "utf8");
    expect(src).not.toContain("@/components/ui/button");
    expect(src).toContain("min-h-[35dvh]");
    expect(src).toContain("landscape:min-h-[50dvh]");
  });

  it("button.tsx exposes size none without sm: height tokens", () => {
    const src = readFileSync("src/components/ui/button.tsx", "utf8");
    expect(src).toMatch(/none:\s*""/);
    expect(src).toContain("sm:h-9 sm:min-h-9");
  });
});
