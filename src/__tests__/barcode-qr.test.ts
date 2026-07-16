import { describe, expect, it } from "vitest";
import {
  canShowSupplyQr,
  formatBarcode,
  normalizeBarcode,
} from "@/lib/barcode";

describe("canShowSupplyQr", () => {
  it("is true when a barcode can be normalized", () => {
    expect(canShowSupplyQr("hdml-4ndr-8k23")).toBe(true);
    expect(canShowSupplyQr("HDML4NDR8K23")).toBe(true);
  });

  it("is false when barcode is missing or empty", () => {
    expect(canShowSupplyQr(null)).toBe(false);
    expect(canShowSupplyQr(undefined)).toBe(false);
    expect(canShowSupplyQr("")).toBe(false);
    expect(canShowSupplyQr("---")).toBe(false);
  });
});

describe("QR payload barcode helpers", () => {
  it("uses canonical form for QR payload and formatted for display", () => {
    const raw = "hdml-4ndr-8k23";
    expect(normalizeBarcode(raw)).toBe("HDML4NDR8K23");
    expect(formatBarcode(raw)).toBe("HDML-4NDR-8K23");
  });
});
