import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveKioskScanLookup } from "@/lib/kiosk-scan-lookup";

describe("resolveKioskScanLookup", () => {
  it("stays on the scan step when the barcode is unknown", () => {
    expect(
      resolveKioskScanLookup({
        online: true,
        ok: false,
        error: "Item not found",
      })
    ).toEqual({
      proceed: false,
      itemName: null,
      error: "Item not found",
    });
  });

  it("advances with the item name when lookup succeeds", () => {
    expect(
      resolveKioskScanLookup({
        online: true,
        ok: true,
        name: "Nitrile gloves",
      })
    ).toEqual({
      proceed: true,
      itemName: "Nitrile gloves",
      error: null,
    });
  });

  it("still advances when offline or the lookup request fails", () => {
    expect(resolveKioskScanLookup({ online: false })).toEqual({
      proceed: true,
      itemName: null,
      error: null,
    });
    expect(
      resolveKioskScanLookup({ online: true, lookupFailedNetwork: true })
    ).toEqual({
      proceed: true,
      itemName: null,
      error: null,
    });
  });
});

describe("kiosk scan lookup wiring", () => {
  it("looks up the barcode before opening quantity entry", () => {
    const src = readFileSync("src/app/kiosk/kiosk-client.tsx", "utf8");
    expect(src).toContain("/api/kiosk/lookup");
    expect(src).toContain("resolveKioskScanLookup");
    expect(src).not.toMatch(
      /handleScan[\s\S]*setStep\("quantity"\);\s*setError\(null\)/
    );
  });
});
