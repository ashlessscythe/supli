import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { stockLevelRepository } from "@/server/repositories/stock-level.repository";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockLevel: {
      findMany: vi.fn(),
    },
    supply: {
      update: vi.fn(),
    },
  },
}));

describe("stockLevelRepository.syncSupplyTotals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sums only active location quantities", async () => {
    vi.mocked(prisma.stockLevel.findMany).mockResolvedValue([
      { quantity: 6, minimumThreshold: 3 },
      { quantity: 4, minimumThreshold: 2 },
    ] as never);
    vi.mocked(prisma.supply.update).mockResolvedValue({
      id: "supply-1",
      quantity: 10,
      minimumThreshold: 2,
    } as never);

    await stockLevelRepository.syncSupplyTotals("supply-1");

    expect(prisma.stockLevel.findMany).toHaveBeenCalledWith({
      where: { supplyId: "supply-1", location: { isActive: true } },
    });
    expect(prisma.supply.update).toHaveBeenCalledWith({
      where: { id: "supply-1" },
      data: {
        quantity: 10,
        minimumThreshold: 2,
      },
    });
  });

  it("zeros quantity and threshold when no active location levels remain", async () => {
    vi.mocked(prisma.stockLevel.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.supply.update).mockResolvedValue({
      id: "supply-1",
      quantity: 0,
      minimumThreshold: 0,
    } as never);

    await stockLevelRepository.syncSupplyTotals("supply-1");

    expect(prisma.supply.update).toHaveBeenCalledWith({
      where: { id: "supply-1" },
      data: {
        quantity: 0,
        minimumThreshold: 0,
      },
    });
  });
});
