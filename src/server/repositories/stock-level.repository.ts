import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/server/audit";

export const stockLevelRepository = {
  findBySupply(supplyId: string) {
    return prisma.stockLevel.findMany({
      where: { supplyId },
      include: { location: true },
    });
  },

  findAtLocation(supplyId: string, locationId: string) {
    return prisma.stockLevel.findUnique({
      where: { supplyId_locationId: { supplyId, locationId } },
    });
  },

  upsert(
    supplyId: string,
    locationId: string,
    data: { quantity: number; minimumThreshold: number },
    tx?: TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.stockLevel.upsert({
      where: { supplyId_locationId: { supplyId, locationId } },
      create: { supplyId, locationId, ...data },
      update: data,
    });
  },

  async syncSupplyTotals(supplyId: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    const levels = await client.stockLevel.findMany({ where: { supplyId } });
    const quantity = levels.reduce((sum, l) => sum + l.quantity, 0);
    const minimumThreshold = Math.min(
      ...levels.map((l) => l.minimumThreshold),
      Infinity
    );

    return client.supply.update({
      where: { id: supplyId },
      data: {
        quantity,
        minimumThreshold: minimumThreshold === Infinity ? 0 : minimumThreshold,
      },
    });
  },
};
