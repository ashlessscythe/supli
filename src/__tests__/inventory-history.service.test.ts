import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockMovementType, VendorReorderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inventoryHistoryService } from "@/server/services/inventory-history.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vendorReorder: { findMany: vi.fn() },
    stockMovement: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

describe("inventoryHistoryService.search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.vendorReorder.findMany).mockResolvedValue([]);
    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  });

  it("returns merged orders, receipts, and consumptions sorted by date", async () => {
    vi.mocked(prisma.vendorReorder.findMany).mockResolvedValue([
      {
        id: "order-1",
        quantity: 10,
        orderedAt: new Date("2026-07-10T12:00:00.000Z"),
        externalPoNumber: "PO-100",
        status: VendorReorderStatus.ORDERED,
        notes: "rush",
        supply: { id: "s1", name: "Rifle" },
        vendor: { name: "Balam" },
        createdBy: { username: "admin" },
      },
    ] as never);

    vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
      {
        id: "recv-1",
        type: StockMovementType.RECEIVE,
        quantity: 4,
        createdAt: new Date("2026-07-12T12:00:00.000Z"),
        notes: "dock A",
        userId: "u1",
        supply: { id: "s1", name: "Rifle" },
        location: { name: "Xylem" },
        vendorReorder: {
          externalPoNumber: "PO-100",
          vendor: { name: "Balam" },
        },
      },
      {
        id: "con-1",
        type: StockMovementType.CONSUME,
        quantity: 1,
        createdAt: new Date("2026-07-11T12:00:00.000Z"),
        notes: null,
        userId: "u2",
        supply: { id: "s2", name: "FCS" },
        location: { name: "Watchpoint Delta" },
        vendorReorder: null,
      },
    ] as never);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", username: "receiver" },
      { id: "u2", username: "staff" },
    ] as never);

    const result = await inventoryHistoryService.search({ kind: "all" });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.map((row) => row.kind)).toEqual([
      "receipt",
      "consumption",
      "order",
    ]);
    expect(result.data[0]).toMatchObject({
      kind: "receipt",
      supplyName: "Rifle",
      externalPoNumber: "PO-100",
      username: "receiver",
    });
    expect(result.data[2]).toMatchObject({
      kind: "order",
      externalPoNumber: "PO-100",
      status: VendorReorderStatus.ORDERED,
    });
  });

  it("searches only orders when an order status filter is set", async () => {
    vi.mocked(prisma.vendorReorder.findMany).mockResolvedValue([
      {
        id: "order-2",
        quantity: 3,
        orderedAt: new Date("2026-07-01T00:00:00.000Z"),
        externalPoNumber: null,
        status: VendorReorderStatus.RECEIVED,
        notes: null,
        supply: { id: "s1", name: "Armor" },
        vendor: null,
        createdBy: { username: "admin" },
      },
    ] as never);

    const result = await inventoryHistoryService.search({
      kind: "all",
      status: VendorReorderStatus.RECEIVED,
    });

    expect(result.success).toBe(true);
    expect(prisma.stockMovement.findMany).not.toHaveBeenCalled();
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.kind).toBe("order");
    }
  });

  it("limits movement search to consumptions when kind=consumption", async () => {
    await inventoryHistoryService.search({ kind: "consumption" });

    expect(prisma.vendorReorder.findMany).not.toHaveBeenCalled();
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: [StockMovementType.CONSUME] },
        }),
      })
    );
  });
});
