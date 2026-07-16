"use server";

import { requireSession } from "@/lib/auth/session";
import { inventoryHistoryService } from "@/server/services/inventory-history.service";
import type { InventoryHistorySearchInput } from "@/lib/validation/inventory-history";

export async function searchInventoryHistory(
  input: InventoryHistorySearchInput
) {
  try {
    await requireSession();
    return inventoryHistoryService.search(input);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
