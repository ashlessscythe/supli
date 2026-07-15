import { beforeEach, describe, expect, it, vi } from "vitest";
import { locationService } from "@/server/services/location.service";
import { locationRepository } from "@/server/repositories/location.repository";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    stockLevel: {
      findMany: vi.fn(),
    },
    location: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/repositories/location.repository", () => ({
  locationRepository: {
    findAll: vi.fn(),
    findAllAdmin: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/server/repositories/stock-level.repository", () => ({
  stockLevelRepository: {
    syncSupplyTotals: vi.fn(),
  },
}));

describe("locationService.create", () => {
  const tx = {
    auditLog: { create: vi.fn() },
    location: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("creates a location with audit", async () => {
    tx.location.create.mockResolvedValue({
      id: "loc-1",
      name: "Cage A",
      type: "CAGE",
    });

    const result = await locationService.create("admin-1", {
      name: "Cage A",
      type: "CAGE",
    });

    expect(result.success).toBe(true);
    expect(tx.location.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: { userId: "admin-1", action: "Created location: Cage A" },
    });
  });

  it("maps unique name violations to a friendly error", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue({ code: "P2002" });

    const result = await locationService.create("admin-1", {
      name: "Cage A",
      type: "CAGE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("A location with that name already exists");
    }
  });
});

describe("locationService.update deactivate", () => {
  const tx = {
    auditLog: { create: vi.fn() },
    location: { update: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (operation) =>
      operation(tx as never)
    );
  });

  it("resyncs supply totals for every stocked supply when deactivating", async () => {
    vi.mocked(locationRepository.findById).mockResolvedValue({
      id: "loc-1",
      name: "Old cage",
      type: "CAGE",
      isActive: true,
    } as never);
    tx.location.update.mockResolvedValue({
      id: "loc-1",
      name: "Old cage",
      isActive: false,
    });
    vi.mocked(prisma.stockLevel.findMany).mockResolvedValue([
      { supplyId: "s1" },
      { supplyId: "s2" },
    ] as never);
    vi.mocked(stockLevelRepository.syncSupplyTotals).mockResolvedValue(
      {} as never
    );

    const result = await locationService.update("admin-1", {
      id: "loc-1",
      name: "Old cage",
      type: "CAGE",
      isActive: false,
    });

    expect(result.success).toBe(true);
    expect(prisma.stockLevel.findMany).toHaveBeenCalledWith({
      where: { locationId: "loc-1" },
      select: { supplyId: true },
    });
    expect(stockLevelRepository.syncSupplyTotals).toHaveBeenCalledWith("s1");
    expect(stockLevelRepository.syncSupplyTotals).toHaveBeenCalledWith("s2");
  });

  it("does not resync when location was already inactive", async () => {
    vi.mocked(locationRepository.findById).mockResolvedValue({
      id: "loc-1",
      name: "Old cage",
      type: "CAGE",
      isActive: false,
    } as never);
    tx.location.update.mockResolvedValue({
      id: "loc-1",
      isActive: false,
    });

    await locationService.update("admin-1", {
      id: "loc-1",
      name: "Old cage",
      type: "CAGE",
      isActive: false,
    });

    expect(stockLevelRepository.syncSupplyTotals).not.toHaveBeenCalled();
  });

  it("fails when location is missing", async () => {
    vi.mocked(locationRepository.findById).mockResolvedValue(null as never);

    const result = await locationService.update("admin-1", {
      id: "missing",
      name: "X",
      type: "CAGE",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Location not found");
    }
  });
});
