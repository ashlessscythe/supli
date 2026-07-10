import { beforeEach, describe, expect, it, vi } from "vitest";
import { StockMovementType, VendorReorderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stockMovementService } from "@/server/services/stock-movement.service";
import { locationRepository } from "@/server/repositories/location.repository";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { notificationService } from "@/server/services/notification.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    supply: {
      findFirst: vi.fn(),
    },
    vendorReorder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    vendor: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/repositories/location.repository", () => ({
  locationRepository: {
    findById: vi.fn(),
    findDefault: vi.fn(),
  },
}));

vi.mock("@/server/repositories/supply.repository", () => ({
  supplyRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/server/repositories/stock-level.repository", () => ({
  stockLevelRepository: {
    findAtLocation: vi.fn(),
    syncSupplyTotals: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notificationService: {
    notifyAdminsLowStock: vi.fn(),
  },
}));

describe("stockMovementService.receive", () => {
  const userId = "user-1";
  const supply = {
    id: "supply-1",
    name: "Nitrile gloves",
    minimumThreshold: 5,
  };
  const location = {
    id: "location-1",
    name: "Receiving dock",
  };

  const tx = {
    auditLog: {
      create: vi.fn(),
    },
    stockLevel: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    vendorReorder: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(supplyRepository.findById).mockResolvedValue(supply as never);
    vi.mocked(locationRepository.findById).mockResolvedValue(location as never);
    vi.mocked(locationRepository.findDefault).mockResolvedValue(null as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...supply,
      quantity: 12,
    } as never);

    tx.stockLevel.findUnique.mockResolvedValue(null);
    tx.stockMovement.create.mockResolvedValue({ id: "movement-1" });
    tx.vendorReorder.findUnique.mockResolvedValue({
      id: "reorder-1",
      supplyId: supply.id,
      quantity: 12,
      status: VendorReorderStatus.ORDERED,
    });
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue({
      id: "reorder-1",
      supplyId: supply.id,
      quantity: 12,
      status: VendorReorderStatus.ORDERED,
    } as never);
    vi.mocked(prisma.stockMovement.aggregate).mockResolvedValue({
      _sum: { quantity: 0 },
    } as never);
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({
      id: "vendor-1",
      name: "Balam Industries",
    } as never);
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: 12 } });
  });

  it("records received stock and marks a fully received vendor reorder", async () => {
    const result = await stockMovementService.receive(userId, {
      supplyId: supply.id,
      locationId: location.id,
      quantity: 12,
      vendorId: "vendor-1",
      vendorReorderId: "reorder-1",
      externalPoRef: " PO-123 ",
      notes: " Delivered on pallet 4 ",
    });

    expect(result.success).toBe(true);
    expect(tx.stockLevel.create).toHaveBeenCalledWith({
      data: {
        supplyId: supply.id,
        locationId: location.id,
        quantity: 12,
        minimumThreshold: supply.minimumThreshold,
      },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        supplyId: supply.id,
        locationId: location.id,
        quantity: 12,
        type: StockMovementType.RECEIVE,
        userId,
        notes: "PO: PO-123 | Vendor: Balam Industries | Delivered on pallet 4",
        vendorReorderId: "reorder-1",
      },
    });
    expect(tx.vendorReorder.update).toHaveBeenCalledWith({
      where: { id: "reorder-1" },
      data: {
        status: VendorReorderStatus.RECEIVED,
        receivedAt: expect.any(Date),
      },
    });
    expect(stockLevelRepository.syncSupplyTotals).toHaveBeenCalledWith(
      supply.id,
      tx
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId,
        action: "Received 12 Nitrile gloves at Receiving dock",
      },
    });
  });

  it("increments an existing stock level instead of creating a new one", async () => {
    tx.stockLevel.findUnique.mockResolvedValue({
      supplyId: supply.id,
      locationId: location.id,
      quantity: 8,
    });

    await stockMovementService.receive(userId, {
      supplyId: supply.id,
      locationId: location.id,
      quantity: 4,
    });

    expect(tx.stockLevel.create).not.toHaveBeenCalled();
    expect(tx.stockLevel.update).toHaveBeenCalledWith({
      where: {
        supplyId_locationId: {
          supplyId: supply.id,
          locationId: location.id,
        },
      },
      data: { quantity: { increment: 4 } },
    });
  });

  it("marks a vendor reorder as partially received when quantity is short", async () => {
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue({
      id: "reorder-1",
      supplyId: supply.id,
      quantity: 20,
      status: VendorReorderStatus.ORDERED,
    } as never);
    vi.mocked(prisma.stockMovement.aggregate).mockResolvedValue({
      _sum: { quantity: 0 },
    } as never);
    tx.vendorReorder.findUnique.mockResolvedValue({
      id: "reorder-1",
      supplyId: supply.id,
      quantity: 20,
      status: VendorReorderStatus.ORDERED,
    });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: 8 } });

    await stockMovementService.receive(userId, {
      supplyId: supply.id,
      locationId: location.id,
      quantity: 8,
      vendorReorderId: "reorder-1",
    });

    expect(tx.vendorReorder.update).toHaveBeenCalledWith({
      where: { id: "reorder-1" },
      data: {
        status: VendorReorderStatus.PARTIALLY_RECEIVED,
        receivedAt: undefined,
      },
    });
  });

  it("rejects linking a receipt to an open order for a different supply", async () => {
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue({
      id: "reorder-1",
      supplyId: "other-supply",
      quantity: 12,
      status: VendorReorderStatus.ORDERED,
    } as never);

    const result = await stockMovementService.receive(userId, {
      supplyId: supply.id,
      locationId: location.id,
      quantity: 4,
      vendorReorderId: "reorder-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Open order does not match the selected supply");
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects receiving more than the remaining quantity on a linked open order", async () => {
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue({
      id: "reorder-1",
      supplyId: supply.id,
      quantity: 20,
      status: VendorReorderStatus.PARTIALLY_RECEIVED,
    } as never);
    vi.mocked(prisma.stockMovement.aggregate).mockResolvedValue({
      _sum: { quantity: 15 },
    } as never);

    const result = await stockMovementService.receive(userId, {
      supplyId: supply.id,
      locationId: location.id,
      quantity: 8,
      vendorReorderId: "reorder-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Cannot receive more than 5 remaining on this open order"
      );
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects linking a receipt when the open order is not found", async () => {
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue(null);

    const result = await stockMovementService.receive(userId, {
      supplyId: supply.id,
      locationId: location.id,
      quantity: 4,
      vendorReorderId: "missing-reorder",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Open order not found");
    }
  });
});

describe("stockMovementService.consume", () => {
  const userId = "user-1";
  const location = { id: "location-1", name: "Kiosk" };
  const supply = {
    id: "supply-1",
    name: "Paper towels",
    barcode: "PAPRTWL123",
  };

  const tx = {
    auditLog: { create: vi.fn() },
    stockLevel: { update: vi.fn() },
    stockMovement: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(locationRepository.findById).mockResolvedValue(location as never);
    vi.mocked(prisma.supply.findFirst).mockResolvedValue(supply as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...supply,
      quantity: 7,
    } as never);
    tx.stockMovement.create.mockResolvedValue({ id: "movement-1" });
  });

  it("records kiosk consumption when stock is available", async () => {
    vi.mocked(stockLevelRepository.findAtLocation).mockResolvedValue({
      supplyId: supply.id,
      locationId: location.id,
      quantity: 10,
    } as never);

    const result = await stockMovementService.consume(userId, {
      barcode: "PAPR-TWL-123",
      quantity: 3,
      locationId: location.id,
      badgeId: "badge-42",
    });

    expect(result.success).toBe(true);
    expect(prisma.supply.findFirst).toHaveBeenCalledWith({
      where: { barcode: "PAPRTWL123" },
    });
    expect(tx.stockLevel.update).toHaveBeenCalledWith({
      where: {
        supplyId_locationId: {
          supplyId: supply.id,
          locationId: location.id,
        },
      },
      data: { quantity: { decrement: 3 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        supplyId: supply.id,
        locationId: location.id,
        quantity: 3,
        type: StockMovementType.CONSUME,
        badgeId: "badge-42",
        userId,
        notes: null,
      },
    });
  });

  it("rejects consumption when stock is insufficient", async () => {
    vi.mocked(stockLevelRepository.findAtLocation).mockResolvedValue({
      supplyId: supply.id,
      locationId: location.id,
      quantity: 2,
    } as never);

    const result = await stockMovementService.consume(userId, {
      barcode: supply.barcode,
      quantity: 3,
      locationId: location.id,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Insufficient stock at this location");
    }
  });

  it("rejects consumption when barcode does not match a supply", async () => {
    vi.mocked(prisma.supply.findFirst).mockResolvedValue(null as never);

    const result = await stockMovementService.consume(userId, {
      barcode: "UNKNOWN",
      quantity: 1,
      locationId: location.id,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Item not found");
    }
  });

  it("alerts admins when consumption leaves stock at or below threshold", async () => {
    vi.mocked(stockLevelRepository.findAtLocation).mockResolvedValue({
      supplyId: supply.id,
      locationId: location.id,
      quantity: 10,
    } as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...supply,
      quantity: 4,
      minimumThreshold: 5,
    } as never);

    await stockMovementService.consume(userId, {
      barcode: supply.barcode,
      quantity: 6,
      locationId: location.id,
    });

    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      supply.name,
      4,
      supply.id
    );
  });

  it("does not alert admins when stock remains above threshold", async () => {
    vi.mocked(stockLevelRepository.findAtLocation).mockResolvedValue({
      supplyId: supply.id,
      locationId: location.id,
      quantity: 10,
    } as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...supply,
      quantity: 8,
      minimumThreshold: 5,
    } as never);

    await stockMovementService.consume(userId, {
      barcode: supply.barcode,
      quantity: 2,
      locationId: location.id,
    });

    expect(notificationService.notifyAdminsLowStock).not.toHaveBeenCalled();
  });
});

describe("stockMovementService.consumeBulk", () => {
  const userId = "staff-1";
  const location = { id: "location-1", name: "Supply closet" };
  const supplyA = {
    id: "supply-a",
    name: "Head unit",
    minimumThreshold: 2,
  };
  const supplyB = {
    id: "supply-b",
    name: "Arm unit",
    minimumThreshold: 5,
  };

  const tx = {
    auditLog: { create: vi.fn() },
    stockLevel: { update: vi.fn() },
    stockMovement: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(locationRepository.findById).mockResolvedValue(location as never);
    vi.mocked(locationRepository.findDefault).mockResolvedValue(location as never);
    tx.stockMovement.create.mockResolvedValue({ id: "movement-1" });
  });

  it("checks out multiple items in one transaction", async () => {
    vi.mocked(supplyRepository.findById).mockImplementation((async (id: string) => {
      if (id === supplyA.id) return supplyA as never;
      if (id === supplyB.id) return supplyB as never;
      return null;
    }) as never);
    vi.mocked(stockLevelRepository.findAtLocation).mockImplementation((async (
      supplyId: string
    ) =>
      ({
        supplyId,
        locationId: location.id,
        quantity: 10,
      }) as never) as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockImplementation(
      async (supplyId) => {
        if (supplyId === supplyA.id) {
          return { ...supplyA, quantity: 9 } as never;
        }
        return { ...supplyB, quantity: 8 } as never;
      }
    );

    const result = await stockMovementService.consumeBulk(userId, {
      items: [
        { supplyId: supplyA.id, quantity: 1 },
        { supplyId: supplyB.id, quantity: 2 },
      ],
    });

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.stockLevel.update).toHaveBeenCalledTimes(2);
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        supplyId: supplyA.id,
        locationId: location.id,
        quantity: 1,
        type: StockMovementType.CONSUME,
        badgeId: null,
        userId,
        notes: null,
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it("merges duplicate supply lines before checkout", async () => {
    vi.mocked(supplyRepository.findById).mockResolvedValue(supplyB as never);
    vi.mocked(stockLevelRepository.findAtLocation).mockResolvedValue({
      supplyId: supplyB.id,
      locationId: location.id,
      quantity: 10,
    } as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...supplyB,
      quantity: 6,
    } as never);

    await stockMovementService.consumeBulk(userId, {
      items: [
        { supplyId: supplyB.id, quantity: 2 },
        { supplyId: supplyB.id, quantity: 2 },
      ],
    });

    expect(tx.stockLevel.update).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supplyId: supplyB.id,
        quantity: 4,
        userId,
      }),
    });
  });

  it("rejects bulk checkout when any item has insufficient stock", async () => {
    vi.mocked(supplyRepository.findById).mockImplementation((async (id: string) => {
      if (id === supplyA.id) return supplyA as never;
      if (id === supplyB.id) return supplyB as never;
      return null;
    }) as never);
    vi.mocked(stockLevelRepository.findAtLocation).mockImplementation((async (
      supplyId: string
    ) =>
      ({
        supplyId,
        locationId: location.id,
        quantity: supplyId === supplyB.id ? 1 : 10,
      }) as never) as never);

    const result = await stockMovementService.consumeBulk(userId, {
      items: [
        { supplyId: supplyA.id, quantity: 1 },
        { supplyId: supplyB.id, quantity: 2 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Insufficient stock for Arm unit at this location"
      );
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("alerts admins for each bulk item that ends at or below threshold", async () => {
    vi.mocked(supplyRepository.findById).mockImplementation((async (id: string) => {
      if (id === supplyA.id) return supplyA as never;
      if (id === supplyB.id) return supplyB as never;
      return null;
    }) as never);
    vi.mocked(stockLevelRepository.findAtLocation).mockImplementation((async (
      supplyId: string
    ) =>
      ({
        supplyId,
        locationId: location.id,
        quantity: 10,
      }) as never) as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockImplementation(
      async (supplyId) => {
        if (supplyId === supplyA.id) {
          return { ...supplyA, quantity: 2 } as never;
        }
        return { ...supplyB, quantity: 8 } as never;
      }
    );

    await stockMovementService.consumeBulk(userId, {
      items: [
        { supplyId: supplyA.id, quantity: 1 },
        { supplyId: supplyB.id, quantity: 2 },
      ],
    });

    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledTimes(1);
    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      supplyA.name,
      2,
      supplyA.id
    );
  });
});

describe("stockMovementService.adjust", () => {
  const userId = "user-1";
  const supply = {
    id: "supply-1",
    name: "Disinfectant",
    minimumThreshold: 5,
  };
  const location = { id: "location-1", name: "Main stockroom" };

  const tx = {
    auditLog: { create: vi.fn() },
    stockMovement: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(supplyRepository.findById).mockResolvedValue(supply as never);
    vi.mocked(locationRepository.findById).mockResolvedValue(location as never);
    vi.mocked(stockLevelRepository.findAtLocation).mockResolvedValue({
      supplyId: supply.id,
      locationId: location.id,
      quantity: 10,
      minimumThreshold: 5,
    } as never);
    vi.mocked(stockLevelRepository.upsert).mockResolvedValue({} as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue({
      ...supply,
      quantity: 4,
    } as never);
    tx.stockMovement.create.mockResolvedValue({ id: "movement-1" });
  });

  it("records a cycle-count adjustment and alerts admins when stock is low", async () => {
    const result = await stockMovementService.adjust(userId, {
      supplyId: supply.id,
      locationId: location.id,
      newQuantity: 4,
      reason: "Monthly count",
    });

    expect(result.success).toBe(true);
    expect(stockLevelRepository.upsert).toHaveBeenCalledWith(
      supply.id,
      location.id,
      { quantity: 4, minimumThreshold: 5 },
      tx
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        supplyId: supply.id,
        locationId: location.id,
        quantity: 6,
        type: StockMovementType.ADJUST,
        userId,
        notes: "Cycle count: 10 → 4. Monthly count",
      },
    });
    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      supply.name,
      4,
      supply.id
    );
  });

  it("rejects adjustment when quantity is unchanged", async () => {
    const result = await stockMovementService.adjust(userId, {
      supplyId: supply.id,
      locationId: location.id,
      newQuantity: 10,
      reason: "No change",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Quantity is already at the requested count");
    }
  });
});

describe("stockMovementService.updateVendorReorder", () => {
  const userId = "user-1";

  const tx = {
    auditLog: { create: vi.fn() },
    vendorReorder: {
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("updates an open order when quantity is still above received amount", async () => {
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue({
      id: "reorder-1",
      supplyId: "supply-1",
      quantity: 20,
      status: VendorReorderStatus.PARTIALLY_RECEIVED,
      vendorId: "vendor-1",
      externalPoNumber: "PO-1",
      notes: "Old note",
      supply: { name: "Gloves" },
      stockMovements: [{ quantity: 8 }],
    } as never);
    tx.vendorReorder.update.mockResolvedValue({
      id: "reorder-1",
      quantity: 25,
    });

    const result = await stockMovementService.updateVendorReorder(
      userId,
      "reorder-1",
      {
        quantity: 25,
        externalPoNumber: "PO-2",
        notes: "Corrected PO",
      }
    );

    expect(result.success).toBe(true);
    expect(tx.vendorReorder.update).toHaveBeenCalledWith({
      where: { id: "reorder-1" },
      data: expect.objectContaining({
        quantity: 25,
        externalPoNumber: "PO-2",
        notes: "Corrected PO",
        status: VendorReorderStatus.PARTIALLY_RECEIVED,
      }),
    });
  });

  it("rejects reducing quantity below what has already been received", async () => {
    vi.mocked(prisma.vendorReorder.findUnique).mockResolvedValue({
      id: "reorder-1",
      supplyId: "supply-1",
      quantity: 20,
      status: VendorReorderStatus.PARTIALLY_RECEIVED,
      supply: { name: "Gloves" },
      stockMovements: [{ quantity: 12 }],
    } as never);

    const result = await stockMovementService.updateVendorReorder(
      userId,
      "reorder-1",
      { quantity: 10 }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Quantity cannot be less than 12 already received"
      );
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
