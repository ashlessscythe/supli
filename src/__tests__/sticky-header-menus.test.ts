import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sticky header menus stay non-modal", () => {
  it("keeps the theme selector non-modal so body pointer-events cannot stick", () => {
    const src = readFileSync("src/components/theme-selector.tsx", "utf8");

    expect(src).toContain("modal={false}");
    expect(src).toContain('removeProperty("pointer-events")');
    expect(src).toContain("void setThemePreference(theme)");
    expect(src).toContain("onSelect=");
  });

  it("keeps sticky header nav and notifications non-modal", () => {
    const header = readFileSync("src/components/layout/header.tsx", "utf8");
    const bell = readFileSync(
      "src/components/layout/notification-bell.tsx",
      "utf8"
    );

    expect(header).toContain("modal={false}");
    expect(bell).toContain("modal={false}");
  });
});
