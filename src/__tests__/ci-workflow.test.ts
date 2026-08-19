import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CI workflow", () => {
  it("runs unit, integration, and build as separate jobs", () => {
    const src = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(src).toMatch(/^  unit:/m);
    expect(src).toMatch(/^  integration:/m);
    expect(src).toMatch(/^  build:/m);
    expect(src).toContain("npm run test:unit");
    expect(src).toContain("npm run test:integration");
    expect(src).toContain("postgres:16-alpine");
    expect(src).toContain("5433:5432");
  });
});
