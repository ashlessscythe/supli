import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

export const adminService = {
  async getReceiptsChartData() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const grouped = await prisma.stockMovement.groupBy({
      by: ["supplyId"],
      where: {
        type: StockMovementType.RECEIVE,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    });

    if (grouped.length === 0) return [];

    const supplies = await prisma.supply.findMany({
      where: { id: { in: grouped.map((g) => g.supplyId) } },
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

  async getSupplyChartData() {
    const supplies = await prisma.supply.findMany({
      select: { name: true, quantity: true, minimumThreshold: true },
      orderBy: { quantity: "asc" },
      take: 10,
    });

    return supplies.map((supply) => ({
      name: supply.name,
      quantity: supply.quantity,
      threshold: supply.minimumThreshold,
      status:
        supply.quantity <= supply.minimumThreshold
          ? ("Low" as const)
          : ("OK" as const),
    }));
  },

  async getStats() {
    const [totalUsers, totalSupplies, lowStockItems] = await Promise.all([
      prisma.user.count(),
      prisma.supply.count(),
      prisma.supply.count({
        where: {
          quantity: { lte: prisma.supply.fields.minimumThreshold },
        },
      }),
    ]);

    return {
      totalUsers,
      totalSupplies,
      lowStockItems,
    };
  },
};
