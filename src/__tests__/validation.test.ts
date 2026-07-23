import { describe, it, expect } from "vitest";
import { supplySchema } from "@/lib/validation/supply";
import { requestSchema } from "@/lib/validation/request";
import {
  registerSchema,
  resetPasswordSchema,
  inviteSchema,
} from "@/lib/validation/user";
import { bulkConsumeSchema, adjustStockSchema } from "@/lib/validation/stock-movement";
import { normalizeBarcode, formatBarcode } from "@/lib/barcode";
import { isValidTheme } from "@/lib/themes";
import { Role } from "@prisma/client";

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

describe("password rules", () => {
  it("rejects passwords missing uppercase, lowercase, digit, or length", () => {
    expect(
      registerSchema.safeParse({
        username: "u",
        email: "u@example.com",
        password: "short1A",
        siteId: "site-1",
      }).success
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        username: "u",
        email: "u@example.com",
        password: "nouppercase1",
        siteId: "site-1",
      }).success
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        username: "u",
        email: "u@example.com",
        password: "NOLOWERCASE1",
        siteId: "site-1",
      }).success
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        username: "u",
        email: "u@example.com",
        password: "NoDigitsHere",
        siteId: "site-1",
      }).success
    ).toBe(false);
  });

  it("accepts a compliant password for register and reset", () => {
    expect(
      registerSchema.safeParse({
        username: "u",
        email: "u@example.com",
        password: "Password1",
        siteId: "site-1",
      }).success
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        token: "tok",
        password: "Password1",
      }).success
    ).toBe(true);
  });

  it("requires email on invite", () => {
    expect(
      inviteSchema.safeParse({
        username: "u",
        role: Role.STAFF,
      }).success
    ).toBe(false);
    expect(
      inviteSchema.safeParse({
        username: "u",
        email: "u@example.com",
        role: Role.STAFF,
      }).success
    ).toBe(true);
  });
});

describe("barcode helpers", () => {
  it("normalizes separators and case for lookups", () => {
    // SUP-PAPR-A4WH-7K21 → strip dashes → SUPPAPPRA4WH7K21
    const canonical = ["S", "U", "P", "P", "A", "P", "R", "A", "4", "W", "H", "7", "K", "2", "1"].join(
      ""
    );
    expect(normalizeBarcode("SUP-PAPR-A4WH-7K21")).toBe(canonical);
    expect(normalizeBarcode("sup-papr-a4wh-7k21")).toBe(canonical);
    expect(normalizeBarcode(null)).toBe("");
  });

  it("formats display barcodes in groups of four", () => {
    expect(formatBarcode("HDML4NDR8K23")).toBe("HDML-4NDR-8K23");
    expect(formatBarcode("")).toBe("");
  });
});

describe("stock movement schemas", () => {
  it("requires at least one bulk consume item with supplyId", () => {
    expect(bulkConsumeSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      bulkConsumeSchema.safeParse({
        items: [{ supplyId: "s1", quantity: 1 }],
      }).success
    ).toBe(true);
  });

  it("rejects negative adjust quantities", () => {
    expect(
      adjustStockSchema.safeParse({
        supplyId: "s1",
        locationId: "l1",
        newQuantity: -1,
        reason: "cycle count",
      }).success
    ).toBe(false);
    expect(
      adjustStockSchema.safeParse({
        supplyId: "s1",
        newQuantity: 0,
        reason: "cycle count",
      }).success
    ).toBe(true);
  });
});

describe("themes", () => {
  it("recognizes valid themes", () => {
    expect(isValidTheme("corporate")).toBe(true);
    expect(isValidTheme("invalid")).toBe(false);
  });
});
