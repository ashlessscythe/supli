export type FilterableSupply = {
  id: string;
  name: string;
  barcode?: string | null;
  internalSku?: string | null;
  itemTypeId?: string | null;
};

/**
 * Filter by optional category id and case-insensitive search over name,
 * barcode, and internalSku. Preserves input (rank) order.
 */
export function filterKioskSupplies<T extends FilterableSupply>(
  supplies: T[],
  options: { categoryId?: string | null; query?: string }
): T[] {
  const categoryId = options.categoryId ?? null;
  const q = (options.query ?? "").trim().toLowerCase();

  return supplies.filter((s) => {
    if (categoryId && s.itemTypeId !== categoryId) return false;
    if (!q) return true;
    const haystack = [s.name, s.barcode ?? "", s.internalSku ?? ""]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
