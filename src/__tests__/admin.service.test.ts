import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { adminService } from "@/server/services/admin.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supply: {
      findMany: vi.fn(),
      count: vi.fn(),
      fields: { minimumThreshold: "minimumThreshold" },
    },
    user: { count: vi.fn() },
    stockMovement: { groupBy: vi.fn() },
  },
}));

describe("adminService.getSupplyChartData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the lowest-quantity supplies with Low/OK status", async () => {
    vi.mocked(prisma.supply.findMany).mockResolvedValue([
      { name: "A", quantity: 1, minimumThreshold: 5 },
      { name: "B", quantity: 10, minimumThreshold: 2 },
    ] as never);

    const rows = await adminService.getSupplyChartData();

    expect(prisma.supply.findMany).toHaveBeenCalledWith({
      select: { name: true, quantity: true, minimumThreshold: true },
      orderBy: { quantity: "asc" },
      take: 10,
    });
    expect(rows).toEqual([
      { name: "A", quantity: 1, threshold: 5, status: "Low" },
      { name: "B", quantity: 10, threshold: 2, status: "OK" },
    ]);
  });
});

describe("adminService.getLowStockItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries supplies at or below threshold ordered by quantity", async () => {
    const items = [
      { id: "1", name: "A", quantity: 1, minimumThreshold: 5 },
    ];
    vi.mocked(prisma.supply.findMany).mockResolvedValue(items as never);

    const result = await adminService.getLowStockItems(5);

    expect(prisma.supply.findMany).toHaveBeenCalledWith({
      where: {
        quantity: { lte: prisma.supply.fields.minimumThreshold },
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        minimumThreshold: true,
      },
      orderBy: { quantity: "asc" },
      take: 5,
    });
    expect(result).toEqual(items);
  });
});
