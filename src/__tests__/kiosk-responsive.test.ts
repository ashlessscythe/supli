import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("kiosk responsive layout", () => {
  it("mode select uses portrait/landscape grid columns", () => {
    const src = readFileSync("src/app/kiosk/mode-select.tsx", "utf8");
    expect(src).toContain("portrait:grid-cols-1 landscape:grid-cols-2");
    expect(src).toContain("min-h-[35dvh]");
    expect(src).toContain("landscape:min-h-[50dvh]");
  });

  it("supply grid uses responsive column classes", () => {
    const src = readFileSync("src/app/kiosk/touch-flow.tsx", "utf8");
    expect(src).toContain(
      "grid-cols-2 gap-3 sm:grid-cols-3 md:landscape:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    );
  });

  it("cart side panel and bottom bar use CSS orientation gates", () => {
    const src = readFileSync("src/app/kiosk/kiosk-cart.tsx", "utf8");
    expect(src).toContain("hidden");
    expect(src).toContain("md:landscape:flex");
    expect(src).toContain("md:landscape:hidden");
  });

  it("portrait cart sheet scrolls the line list with Checkout pinned", () => {
    const src = readFileSync("src/app/kiosk/kiosk-cart.tsx", "utf8");
    // Sheet shell: capped height flex column; overflow-hidden so the list scrolls.
    expect(src).toContain("max-h-[85dvh]");
    expect(src).toMatch(
      /SheetContent[\s\S]*?className="[^"]*flex max-h-\[85dvh\] flex-col[^"]*overflow-hidden/
    );
    // Line list is the scroll container (not nested overflows).
    expect(src).toContain(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
    );
    expect(src).toContain("data-kiosk-cart-lines");
    // Checkout footer is a shrink-0 sibling outside the scroll list.
    expect(src).toContain("shrink-0 border-t bg-background p-4 safe-bottom");
    expect(src).toContain("{checkoutButton}");
  });

  it("tiles have min-h-24 and touch-manipulation", () => {
    const src = readFileSync("src/app/kiosk/supply-tile.tsx", "utf8");
    expect(src).toContain("min-h-24");
    expect(src).toContain("touch-manipulation");
  });

  it("tiles render the supply name prominently without breakpoint height squash", () => {
    const src = readFileSync("src/app/kiosk/supply-tile.tsx", "utf8");
    // Name is a real text node (not aria-only) with planned typography.
    expect(src).toMatch(
      /line-clamp-2[^"]*text-lg[^"]*font-semibold[^>]*>\s*\{name\}\s*</
    );
    // Must not use shadcn Button — its size default applies sm:h-9/sm:min-h-9
    // which squashes tiles (and hides the name) on tablet landscape (≥640px).
    expect(src).not.toMatch(/from "@\/components\/ui\/button"/);
    expect(src).toMatch(/<button\b/);
    expect(src).not.toMatch(/<Button\b/);
    expect(src).not.toMatch(/\bsm:h-\d+\b/);
    expect(src).not.toMatch(/\bsm:min-h-\d+\b/);
    expect(src).not.toMatch(/\bmd:landscape:h-/);
    expect(src).not.toMatch(/\bmd:landscape:max-h-/);
    expect(src).not.toMatch(/\bmd:landscape:hidden\b/);
    expect(src).toContain("whitespace-normal");
    expect(src).toContain("p-4");
  });

  it("supply grid keeps gap-3 so landscape rows do not overlap", () => {
    const src = readFileSync("src/app/kiosk/touch-flow.tsx", "utf8");
    expect(src).toContain("gap-3");
    expect(src).not.toMatch(/auto-rows-\[/);
    expect(src).not.toMatch(/grid-rows-\[/);
  });

  it("manifest orientation is any", () => {
    const src = readFileSync("src/app/manifest.ts", "utf8");
    expect(src).toContain('orientation: "any"');
    expect(src).not.toContain('orientation: "portrait"');
  });
});
