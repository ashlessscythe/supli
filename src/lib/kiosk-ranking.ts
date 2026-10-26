export type KioskUsageAgg = {
  supplyId: string;
  eventCount: number;
  totalQty: number;
};

export type RankableSupply = {
  id: string;
  name: string;
};

/**
 * Sort supplies by consume-event count (desc), then total quantity (desc),
 * then name (asc). Never-used items fall to the alphabetical tail.
 */
export function rankKioskSupplies<T extends RankableSupply>(
  supplies: T[],
  usage: KioskUsageAgg[]
): T[] {
  const byId = new Map(usage.map((u) => [u.supplyId, u]));

  return [...supplies].sort((a, b) => {
    const ua = byId.get(a.id);
    const ub = byId.get(b.id);
    const ca = ua?.eventCount ?? 0;
    const cb = ub?.eventCount ?? 0;
    if (cb !== ca) return cb - ca;
    const qa = ua?.totalQty ?? 0;
    const qb = ub?.totalQty ?? 0;
    if (qb !== qa) return qb - qa;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function usageScoreFor(
  supplyId: string,
  usage: KioskUsageAgg[]
): number {
  return usage.find((u) => u.supplyId === supplyId)?.eventCount ?? 0;
}
