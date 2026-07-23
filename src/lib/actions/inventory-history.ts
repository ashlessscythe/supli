"use server";

import { requireSiteContext } from "@/lib/auth/session";
import { inventoryHistoryService } from "@/server/services/inventory-history.service";
import type { InventoryHistorySearchInput } from "@/lib/validation/inventory-history";

export async function searchInventoryHistory(
  input: InventoryHistorySearchInput
) {
  try {
    const ctx = await requireSiteContext();
    return inventoryHistoryService.search(ctx.siteId, input);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
