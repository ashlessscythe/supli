import { describe, it, expect } from "vitest";
import { supplySchema } from "@/lib/validation/supply";
import { requestSchema } from "@/lib/validation/request";
import { isValidTheme } from "@/lib/themes";

describe("validation", () => {
  it("validates supply input", () => {
    const result = supplySchema.safeParse({
      name: "Paper",
      description: "A4 paper",
      quantity: 10,
      minimumThreshold: 2,
    });
    expect(result.success).toBe(true);
  });

  it("validates request input", () => {
    const result = requestSchema.safeParse({
      supplyId: "abc123",
      quantity: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("themes", () => {
  it("recognizes valid themes", () => {
    expect(isValidTheme("corporate")).toBe(true);
    expect(isValidTheme("invalid")).toBe(false);
  });
});
