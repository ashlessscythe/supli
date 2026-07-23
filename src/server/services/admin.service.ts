import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";
import { toSupplyChartRow } from "@/lib/low-stock";

const LOW_STOCK_WHERE = {
  quantity: { lte: prisma.supply.fields.minimumThreshold },
} as const;

export const adminService = {
  async getReceiptsChartData(siteId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const grouped = await prisma.stockMovement.groupBy({
      by: ["supplyId"],
      where: {
        type: StockMovementType.RECEIVE,
        createdAt: { gte: thirtyDaysAgo },
        supply: { siteId },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    });

    if (grouped.length === 0) return [];

    const supplies = await prisma.supply.findMany({
      where: { id: { in: grouped.map((g) => g.supplyId) }, siteId },
      select: { id: true, name: true },
    });
    const nameMap = new Map(supplies.map((s) => [s.id, s.name]));

    const colors = [
      { color: "#0ea5e9", darkColor: "#38bdf8" },
      { color: "#22c55e", darkColor: "#84cc16" },
      { color: "#8b5cf6", darkColor: "#a78bfa" },
      { color: "#f97316", darkColor: "#fb923c" },
      { color: "#ec4899", darkColor: "#f472b6" },
      { color: "#14b8a6", darkColor: "#2dd4bf" },
      { color: "#eab308", darkColor: "#facc15" },
      { color: "#6366f1", darkColor: "#818cf8" },
    ];

    return grouped.map((item, index) => ({
      name: nameMap.get(item.supplyId) ?? "Unknown",
      value: item._sum.quantity ?? 0,
      color: colors[index % colors.length].color,
      darkColor: colors[index % colors.length].darkColor,
    }));
  },

  async getSupplyChartData(siteId: string) {
    const supplies = await prisma.supply.findMany({
      where: { siteId },
      select: { name: true, quantity: true, minimumThreshold: true },
      orderBy: { quantity: "asc" },
      take: 10,
    });

    return supplies.map(toSupplyChartRow);
  },

  async getLowStockItems(siteId: string, limit = 5) {
    return prisma.supply.findMany({
      where: { siteId, ...LOW_STOCK_WHERE },
      select: {
        id: true,
        name: true,
        quantity: true,
        minimumThreshold: true,
      },
      orderBy: { quantity: "asc" },
      take: limit,
    });
  },

  async getStats(siteId: string) {
    const [totalUsers, totalSupplies, lowStockItems] = await Promise.all([
      prisma.user.count({
        where: {
          siteId,
          NOT: { username: { startsWith: "kiosk-" } },
        },
      }),
      prisma.supply.count({ where: { siteId } }),
      prisma.supply.count({
        where: { siteId, ...LOW_STOCK_WHERE },
      }),
    ]);

    return {
      totalUsers,
      totalSupplies,
      lowStockItems,
    };
  },
};
