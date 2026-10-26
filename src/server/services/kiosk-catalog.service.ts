import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { KIOSK_MOST_USED_WINDOW_DAYS } from "@/lib/kiosk-constants";
import {
  rankKioskSupplies,
  usageScoreFor,
  type KioskUsageAgg,
} from "@/lib/kiosk-ranking";

export type KioskCatalogCategory = {
  id: string;
  name: string;
};

export type KioskCatalogSupply = {
  id: string;
  name: string;
  barcode: string | null;
  internalSku: string | null;
  onHand: number;
  itemTypeId: string | null;
  usageScore: number;
};

export type KioskCatalog = {
  categories: KioskCatalogCategory[];
  supplies: KioskCatalogSupply[];
};

export function mostUsedWindowStart(
  now = new Date(),
  days = KIOSK_MOST_USED_WINDOW_DAYS
): Date {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

export async function getKioskCatalog(siteId: string): Promise<KioskCatalog> {
  const since = mostUsedWindowStart();

  const [rows, usageGroups] = await Promise.all([
    prisma.supply.findMany({
      where: { siteId },
      select: {
        id: true,
        name: true,
        barcode: true,
        internalSku: true,
        quantity: true,
        itemTypeId: true,
        itemType: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.groupBy({
      by: ["supplyId"],
      where: {
        type: StockMovementType.CONSUME,
        supply: { siteId },
        createdAt: { gte: since },
      },
      _count: true,
      _sum: { quantity: true },
    }),
  ]);

  const usage: KioskUsageAgg[] = usageGroups.map((g) => ({
    supplyId: g.supplyId,
    eventCount: g._count,
    totalQty: g._sum.quantity ?? 0,
  }));

  const ranked = rankKioskSupplies(rows, usage);

  const categoryMap = new Map<string, KioskCatalogCategory>();
  for (const row of ranked) {
    if (row.itemType) {
      categoryMap.set(row.itemType.id, {
        id: row.itemType.id,
        name: row.itemType.name,
      });
    }
  }

  const categories = [...categoryMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  const supplies: KioskCatalogSupply[] = ranked.map((row) => ({
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    internalSku: row.internalSku,
    onHand: row.quantity,
    itemTypeId: row.itemTypeId,
    usageScore: usageScoreFor(row.id, usage),
  }));

  return { categories, supplies };
}
