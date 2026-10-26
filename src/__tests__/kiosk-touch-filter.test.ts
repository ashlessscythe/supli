import { describe, expect, it } from "vitest";
import { filterKioskSupplies } from "@/lib/kiosk-touch-filter";

const supplies = [
  {
    id: "1",
    name: "Nitrile Gloves",
    barcode: "ABC123",
    internalSku: "SKU-GLOVE",
    itemTypeId: "cat-a",
  },
  {
    id: "2",
    name: "Paper Towels",
    barcode: "XYZ999",
    internalSku: "SKU-TOWEL",
    itemTypeId: "cat-b",
  },
  {
    id: "3",
    name: "Latex Gloves",
    barcode: "DEF456",
    internalSku: null,
    itemTypeId: "cat-a",
  },
];

describe("filterKioskSupplies", () => {
  it("filters by category and preserves rank order", () => {
    const result = filterKioskSupplies(supplies, { categoryId: "cat-a" });
    expect(result.map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("searches name, barcode, and SKU case-insensitively", () => {
    expect(
      filterKioskSupplies(supplies, { query: "nitrile" }).map((s) => s.id)
    ).toEqual(["1"]);
    expect(
      filterKioskSupplies(supplies, { query: "xyz999" }).map((s) => s.id)
    ).toEqual(["2"]);
    expect(
      filterKioskSupplies(supplies, { query: "sku-glove" }).map((s) => s.id)
    ).toEqual(["1"]);
  });

  it("combines category and search while preserving order", () => {
    const result = filterKioskSupplies(supplies, {
      categoryId: "cat-a",
      query: "GLOVES",
    });
    expect(result.map((s) => s.id)).toEqual(["1", "3"]);
  });
});
