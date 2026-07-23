import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { supplyService } from "@/server/services/supply.service";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { notificationService } from "@/server/services/notification.service";

const SITE_ID = "site-1";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/repositories/supply.repository", () => ({
  supplyRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findDetails: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasPendingRequests: vi.fn(),
    hasRemainingStock: vi.fn(),
    hasOpenOrders: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notificationService: {
    notifyAdminsLowStock: vi.fn(),
  },
}));

describe("supplyService.getDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
  });

  it("returns only active location stock levels", async () => {
    const createdAt = new Date("2026-07-08T20:00:00.000Z");
    const updatedAt = new Date("2026-07-10T18:17:00.000Z");

    vi.mocked(supplyRepository.findDetails).mockResolvedValue({
      id: "supply-1",
      name: "Dafeng Generator",
      description: "Generator",
      quantity: 6,
      minimumThreshold: 3,
      barcode: "DFGN-M2NG-T4K8",
      internalSku: "AC-DFGN06-MING",
      createdAt,
      updatedAt,
      itemType: { name: "Inner Parts", slug: "inner-parts" },
      stockLevels: [
        {
          locationId: "loc-active",
          quantity: 6,
          minimumThreshold: 3,
          location: { name: "Rubicon Research Institute" },
        },
      ],
      itemVendors: [],
      stockMovements: [],
      requests: [],
      vendorReorders: [],
    } as never);

    const result = await supplyService.getDetails(SITE_ID, "supply-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(6);
      expect(result.data.stockLevels).toEqual([
        {
          locationId: "loc-active",
          locationName: "Rubicon Research Institute",
          quantity: 6,
          minimumThreshold: 3,
        },
      ]);
    }
  });
});

describe("supplyService.delete", () => {
  const userId = "admin-1";
  const supply = { id: "supply-1", name: "Gloves" };

  const tx = {
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(supplyRepository.findById).mockResolvedValue(supply as never);
    vi.mocked(supplyRepository.delete).mockResolvedValue(supply as never);
    vi.mocked(supplyRepository.hasPendingRequests).mockResolvedValue(null);
    vi.mocked(supplyRepository.hasRemainingStock).mockResolvedValue(false);
    vi.mocked(supplyRepository.hasOpenOrders).mockResolvedValue(null);
  });

  it("blocks deletion when pending requests exist", async () => {
    vi.mocked(supplyRepository.hasPendingRequests).mockResolvedValue({
      id: "req-1",
    } as never);

    const result = await supplyService.delete(userId, SITE_ID, supply.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot delete supply with pending requests");
    }
    expect(supplyRepository.hasRemainingStock).not.toHaveBeenCalled();
    expect(supplyRepository.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when supply has remaining quantity", async () => {
    vi.mocked(supplyRepository.hasRemainingStock).mockResolvedValue(true);

    const result = await supplyService.delete(userId, SITE_ID, supply.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot delete supply with remaining quantity");
    }
    expect(supplyRepository.hasOpenOrders).not.toHaveBeenCalled();
    expect(supplyRepository.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when open vendor orders exist", async () => {
    vi.mocked(supplyRepository.hasOpenOrders).mockResolvedValue({
      id: "order-1",
    } as never);

    const result = await supplyService.delete(userId, SITE_ID, supply.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot delete supply with open orders");
    }
    expect(supplyRepository.delete).not.toHaveBeenCalled();
  });

  it("deletes supply and records audit when no blockers exist", async () => {
    const result = await supplyService.delete(userId, SITE_ID, supply.id);

    expect(result.success).toBe(true);
    expect(supplyRepository.delete).toHaveBeenCalledWith(supply.id, SITE_ID, tx);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId,
        action: "Deleted supply: Gloves",
        siteId: SITE_ID,
      },
    });
  });
});

describe("supplyService.updateQuantity", () => {
  const userId = "admin-1";
  const supply = {
    id: "supply-1",
    name: "Masks",
    quantity: 20,
    minimumThreshold: 5,
  };

  const tx = {
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(supplyRepository.findById).mockResolvedValue(supply as never);
    vi.mocked(supplyRepository.update).mockResolvedValue({
      ...supply,
      quantity: 4,
    } as never);
  });

  it("rejects negative quantities", async () => {
    const result = await supplyService.updateQuantity(userId, SITE_ID, supply.id, -1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Quantity cannot be negative");
    }
  });

  it("notifies admins when updated quantity is at or below threshold", async () => {
    const result = await supplyService.updateQuantity(userId, SITE_ID, supply.id, 4);

    expect(result.success).toBe(true);
    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      SITE_ID,
      supply.name,
      4,
      supply.id
    );
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
  });
});

describe("supplyService.update", () => {
  const userId = "admin-1";
  const input = {
    name: "Masks",
    description: "Surgical masks",
    quantity: 3,
    minimumThreshold: 5,
    barcode: "MASK1234",
    internalSku: "MSK-001",
    itemTypeId: "type-1",
  };

  const tx = {
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
    vi.mocked(supplyRepository.update).mockResolvedValue({
      id: "supply-1",
      ...input,
    } as never);
    vi.mocked(supplyRepository.findById).mockResolvedValue({
      id: "supply-1",
      ...input,
    } as never);
  });

  it("triggers low-stock notification when threshold is reached", async () => {
    const result = await supplyService.update(userId, SITE_ID, "supply-1", input);

    expect(result.success).toBe(true);
    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      SITE_ID,
      input.name,
      input.quantity,
      "supply-1"
    );
  });
});
