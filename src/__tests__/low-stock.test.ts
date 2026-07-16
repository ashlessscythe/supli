import { describe, expect, it } from "vitest";
import { isLowStock, toSupplyChartRow } from "@/lib/low-stock";

describe("isLowStock", () => {
  it("treats quantity at threshold as low", () => {
    expect(isLowStock(3, 3)).toBe(true);
  });

  it("treats quantity below threshold as low", () => {
    expect(isLowStock(1, 5)).toBe(true);
  });

  it("treats quantity above threshold as ok", () => {
    expect(isLowStock(6, 5)).toBe(false);
  });
});

describe("toSupplyChartRow", () => {
  it("maps low stock supplies to Low status", () => {
    expect(
      toSupplyChartRow({
        name: "FCS",
        quantity: 2,
        minimumThreshold: 4,
      })
    ).toEqual({
      name: "FCS",
      quantity: 2,
      threshold: 4,
      status: "Low",
    });
  });

  it("maps healthy supplies to OK status", () => {
    expect(
      toSupplyChartRow({
        name: "Rifle",
        quantity: 12,
        minimumThreshold: 4,
      })
    ).toEqual({
      name: "Rifle",
      quantity: 12,
      threshold: 4,
      status: "OK",
    });
  });
});
