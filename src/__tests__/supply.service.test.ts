import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { supplyService } from "@/server/services/supply.service";
import { supplyRepository } from "@/server/repositories/supply.repository";
import { notificationService } from "@/server/services/notification.service";

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
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  notificationService: {
    notifyAdminsLowStock: vi.fn(),
  },
}));

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
  });

  it("blocks deletion when pending requests exist", async () => {
    vi.mocked(supplyRepository.hasPendingRequests).mockResolvedValue(true);

    const result = await supplyService.delete(userId, supply.id);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot delete supply with pending requests");
    }
    expect(supplyRepository.delete).not.toHaveBeenCalled();
  });

  it("deletes supply and records audit when no pending requests", async () => {
    vi.mocked(supplyRepository.hasPendingRequests).mockResolvedValue(false);

    const result = await supplyService.delete(userId, supply.id);

    expect(result.success).toBe(true);
    expect(supplyRepository.delete).toHaveBeenCalledWith(supply.id, tx);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId,
        action: "Deleted supply: Gloves",
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
    const result = await supplyService.updateQuantity(userId, supply.id, -1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Quantity cannot be negative");
    }
  });

  it("notifies admins when updated quantity is at or below threshold", async () => {
    const result = await supplyService.updateQuantity(userId, supply.id, 4);

    expect(result.success).toBe(true);
    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
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
  });

  it("triggers low-stock notification when threshold is reached", async () => {
    const result = await supplyService.update(userId, "supply-1", input);

    expect(result.success).toBe(true);
    expect(notificationService.notifyAdminsLowStock).toHaveBeenCalledWith(
      input.name,
      input.quantity,
      "supply-1"
    );
  });
});
