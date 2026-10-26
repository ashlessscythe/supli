import { describe, expect, it } from "vitest";
import { rankKioskSupplies, type KioskUsageAgg } from "@/lib/kiosk-ranking";
import {
  KIOSK_MOST_USED_WINDOW_DAYS,
} from "@/lib/kiosk-constants";
import { mostUsedWindowStart } from "@/server/services/kiosk-catalog.service";

describe("rankKioskSupplies", () => {
  const supplies = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
    { id: "c", name: "Charlie" },
    { id: "d", name: "Delta" },
  ];

  it("orders by event count desc, then total qty desc, then name asc", () => {
    const usage: KioskUsageAgg[] = [
      { supplyId: "a", eventCount: 2, totalQty: 100 },
      { supplyId: "b", eventCount: 5, totalQty: 5 },
      { supplyId: "c", eventCount: 5, totalQty: 20 },
    ];

    const ranked = rankKioskSupplies(supplies, usage);
    expect(ranked.map((s) => s.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("puts never-used items last, alphabetically", () => {
    const usage: KioskUsageAgg[] = [
      { supplyId: "b", eventCount: 1, totalQty: 1 },
    ];
    const ranked = rankKioskSupplies(supplies, usage);
    expect(ranked.map((s) => s.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("breaks ties on equal event count and qty by name", () => {
    const usage: KioskUsageAgg[] = [
      { supplyId: "c", eventCount: 3, totalQty: 10 },
      { supplyId: "a", eventCount: 3, totalQty: 10 },
    ];
    const ranked = rankKioskSupplies(
      [
        { id: "c", name: "Zebra" },
        { id: "a", name: "Apple" },
      ],
      usage
    );
    expect(ranked.map((s) => s.id)).toEqual(["a", "c"]);
  });
});

describe("mostUsedWindowStart", () => {
  it("uses the configured 90-day window for the catalog cutoff", () => {
    expect(KIOSK_MOST_USED_WINDOW_DAYS).toBe(90);
    const now = new Date("2026-10-26T12:00:00.000Z");
    const start = mostUsedWindowStart(now);
    expect(start.toISOString()).toBe("2026-07-28T12:00:00.000Z");
  });
});
