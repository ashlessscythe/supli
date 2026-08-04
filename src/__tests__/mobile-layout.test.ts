import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile layout confinement", () => {
  it("keeps dashboard metric spans responsive so mobile grids stay one column", () => {
    const src = readFileSync(
      "src/components/dashboard/dashboard-charts.tsx",
      "utf8"
    );

    expect(src).toContain('className="md:col-span-2"');
    expect(src).not.toMatch(/className="col-span-2"/);
  });

  it("collapses the top header into a mobile menu below md", () => {
    const src = readFileSync("src/components/layout/header.tsx", "utf8");

    expect(src).toContain('className="shrink-0 md:hidden"');
    expect(src).toContain("Open navigation menu");
    expect(src).toContain(
      'className="ml-6 hidden items-center space-x-6 text-sm font-medium md:flex"'
    );
    expect(src).toContain("max-w-[100vw]");
  });

  it("exports an explicit device-width viewport from the root layout", () => {
    const src = readFileSync("src/app/layout.tsx", "utf8");

    expect(src).toContain("export const viewport");
    expect(src).toContain('width: "device-width"');
    expect(src).toContain("overflow-x-clip");
    expect(src).toContain("viewportFit: \"cover\"");
    expect(src).toContain("themeColor");
  });

  it("wires PWA provider into the root layout", () => {
    const src = readFileSync("src/app/layout.tsx", "utf8");
    expect(src).toContain("PwaProvider");
  });
});
