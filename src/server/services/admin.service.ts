import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

export const adminService = {
  async getOverviewData() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const requests = await prisma.request.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo, lte: now },
      },
      select: { createdAt: true, status: true },
    });

    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: format(date, "MMM"),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    }).reverse();

    return months.map((month) => {
      const monthRequests = requests.filter(
        (r) => r.createdAt >= month.start && r.createdAt <= month.end
      );
      return {
        name: month.month,
        total: monthRequests.length,
        approved: monthRequests.filter((r) => r.status === "APPROVED").length,
        denied: monthRequests.filter((r) => r.status === "DENIED").length,
        pending: monthRequests.filter((r) => r.status === "PENDING").length,
      };
    });
  },

  async getRequestsChartData() {
    const requests = await prisma.request.findMany({
      select: { status: true },
    });

    return [
      {
        name: "Approved",
        value: requests.filter((r) => r.status === "APPROVED").length,
        color: "#22c55e",
        darkColor: "#84cc16",
      },
      {
        name: "Denied",
        value: requests.filter((r) => r.status === "DENIED").length,
        color: "#dc2626",
        darkColor: "#ef4444",
      },
      {
        name: "Pending",
        value: requests.filter((r) => r.status === "PENDING").length,
        color: "#eab308",
        darkColor: "#facc15",
      },
    ].filter((item) => item.value > 0);
  },

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
    const [totalUsers, totalSupplies, totalRequests, pendingRequests, lowStockItems] =
      await Promise.all([
        prisma.user.count(),
        prisma.supply.count(),
        prisma.request.count(),
        prisma.request.count({ where: { status: "PENDING" } }),
        prisma.supply.count({
          where: {
            quantity: { lte: prisma.supply.fields.minimumThreshold },
          },
        }),
      ]);

    return {
      totalUsers,
      totalSupplies,
      totalRequests,
      pendingRequests,
      lowStockItems,
    };
  },
};
