import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("next.config allowedDevOrigins", () => {
  it("allows 127.0.0.1 so Cursor Simple Browser can load /_next assets", () => {
    const src = readFileSync("next.config.js", "utf8");
    expect(src).toContain("allowedDevOrigins");
    expect(src).toContain('"127.0.0.1"');
  });
});
