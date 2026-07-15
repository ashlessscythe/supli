import { describe, expect, it } from "vitest";
import {
  buildLeadTimePatch,
  parseLeadTimeDaysInput,
  parseOptionalNonNegativeNumber,
  parseOptionalPositiveNumber,
} from "@/lib/vendor-link";

describe("parseLeadTimeDaysInput (inline Lead days editor)", () => {
  it("clears lead time when the field is blank", () => {
    expect(parseLeadTimeDaysInput("")).toEqual({ ok: true, value: null });
    expect(parseLeadTimeDaysInput("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts positive whole numbers of days", () => {
    expect(parseLeadTimeDaysInput("1")).toEqual({ ok: true, value: 1 });
    expect(parseLeadTimeDaysInput("14")).toEqual({ ok: true, value: 14 });
    expect(parseLeadTimeDaysInput(" 7 ")).toEqual({ ok: true, value: 7 });
  });

  it("rejects zero, negatives, fractions, and non-numeric input", () => {
    for (const input of ["0", "-1", "1.5", "abc", "3days"]) {
      const result = parseLeadTimeDaysInput(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/whole number of days/i);
      }
    }
  });
});

describe("link form optional number parsers", () => {
  it("parseOptionalPositiveNumber omits empty and invalid values", () => {
    expect(parseOptionalPositiveNumber(undefined)).toBeUndefined();
    expect(parseOptionalPositiveNumber("")).toBeUndefined();
    expect(parseOptionalPositiveNumber("0")).toBeUndefined();
    expect(parseOptionalPositiveNumber("-2")).toBeUndefined();
    expect(parseOptionalPositiveNumber("5")).toBe(5);
  });

  it("parseOptionalNonNegativeNumber allows zero cost", () => {
    expect(parseOptionalNonNegativeNumber("0")).toBe(0);
    expect(parseOptionalNonNegativeNumber("12.5")).toBe(12.5);
    expect(parseOptionalNonNegativeNumber("-1")).toBeUndefined();
    expect(parseOptionalNonNegativeNumber("")).toBeUndefined();
  });
});

describe("buildLeadTimePatch", () => {
  it("matches the inline editor PATCH body for set and clear", () => {
    expect(buildLeadTimePatch("supply-1", 5)).toEqual({
      supplyId: "supply-1",
      leadTimeDays: 5,
    });
    expect(buildLeadTimePatch("supply-1", null)).toEqual({
      supplyId: "supply-1",
      leadTimeDays: null,
    });
  });
});
