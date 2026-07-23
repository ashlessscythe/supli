import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

export const forecastService = {
  async getDepletionEstimates(siteId: string) {
    const supplies = await prisma.supply.findMany({
      where: { siteId, quantity: { gt: 0 } },
      select: {
        id: true,
        name: true,
        quantity: true,
        minimumThreshold: true,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const estimates = await Promise.all(
      supplies.map(async (supply) => {
        const movements = await prisma.stockMovement.groupBy({
          by: ["supplyId"],
          where: {
            supplyId: supply.id,
            supply: { siteId },
            type: StockMovementType.CONSUME,
            createdAt: { gte: thirtyDaysAgo },
          },
          _sum: { quantity: true },
        });

        const consumed = movements[0]?._sum.quantity ?? 0;
        const dailyRate = consumed / 30;

        if (dailyRate <= 0) {
          return {
            supplyId: supply.id,
            name: supply.name,
            quantity: supply.quantity,
            minimumThreshold: supply.minimumThreshold,
            dailyRate: 0,
            daysUntilDepletion: null,
            reorderBy: null,
          };
        }

        const daysUntilDepletion = Math.floor(supply.quantity / dailyRate);
        const reorderBy = new Date();
        reorderBy.setDate(
          reorderBy.getDate() + Math.max(0, daysUntilDepletion - 7)
        );

        return {
          supplyId: supply.id,
          name: supply.name,
          quantity: supply.quantity,
          minimumThreshold: supply.minimumThreshold,
          dailyRate: Math.round(dailyRate * 100) / 100,
          daysUntilDepletion,
          reorderBy: reorderBy.toISOString(),
        };
      })
    );

    return estimates.sort(
      (a, b) =>
        (a.daysUntilDepletion ?? Infinity) - (b.daysUntilDepletion ?? Infinity)
    );
  },

  async getDashboardMetrics(siteId: string) {
    const [lowStock, recentMovements, fastMoving] = await Promise.all([
      prisma.supply.count({
        where: {
          siteId,
          quantity: { lte: prisma.supply.fields.minimumThreshold },
        },
      }),
      prisma.stockMovement.count({
        where: {
          supply: { siteId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.stockMovement.groupBy({
        by: ["supplyId"],
        where: {
          supply: { siteId },
          type: StockMovementType.CONSUME,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    const supplyIds = fastMoving.map((m) => m.supplyId);
    const supplyNames = await prisma.supply.findMany({
      where: { id: { in: supplyIds }, siteId },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(
      supplyNames.map((s) => [s.id, s.name])
    );

    return {
      lowStock,
      recentMovements,
      fastMoving: fastMoving.map((m) => ({
        name: nameMap[m.supplyId] ?? "Unknown",
        consumed: m._sum.quantity ?? 0,
      })),
    };
  },
};
