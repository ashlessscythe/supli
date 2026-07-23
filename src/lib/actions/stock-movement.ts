"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { stockMovementService } from "@/server/services/stock-movement.service";
import { locationService } from "@/server/services/location.service";
import type {
  ReceiveStockInput,
  AdjustStockInput,
  LogVendorReorderInput,
  UpdateVendorReorderInput,
  BulkConsumeInput,
} from "@/lib/validation/stock-movement";

function revalidateInventoryPaths() {
  revalidatePath("/admin/inbound");
  revalidatePath("/dashboard/inbound");
  revalidatePath("/admin/supplies");
  revalidatePath("/dashboard/supplies");
  revalidatePath("/admin/locations");
}

export async function receiveStock(input: ReceiveStockInput) {
  try {
    const ctx = await requireSiteContext();
    const result = await stockMovementService.receive(
      ctx.userId,
      ctx.siteId,
      input
    );
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function adjustStock(input: AdjustStockInput) {
  try {
    const ctx = await requireAdmin();
    const result = await stockMovementService.adjust(
      ctx.userId,
      ctx.siteId,
      input
    );
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function checkoutSupplies(input: BulkConsumeInput) {
  try {
    const ctx = await requireSiteContext();
    const result = await stockMovementService.consumeBulk(
      ctx.userId,
      ctx.siteId,
      input
    );
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getReceiptHistory() {
  try {
    const ctx = await requireSiteContext();
    return stockMovementService.listReceipts(ctx.siteId);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getLocations() {
  try {
    const ctx = await requireSiteContext();
    return locationService.list(ctx.siteId);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function logVendorReorder(input: LogVendorReorderInput) {
  try {
    const ctx = await requireSiteContext();
    const result = await stockMovementService.logVendorReorder(
      ctx.userId,
      ctx.siteId,
      input
    );
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateVendorReorder(
  reorderId: string,
  input: UpdateVendorReorderInput
) {
  try {
    const ctx = await requireSiteContext();
    const result = await stockMovementService.updateVendorReorder(
      ctx.userId,
      ctx.siteId,
      reorderId,
      input
    );
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getCheckoutStockLevels(
  locationId: string,
  supplyIds: string[]
) {
  try {
    const ctx = await requireSiteContext();
    return stockMovementService.getCheckoutStockLevels(
      ctx.siteId,
      locationId,
      supplyIds
    );
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getOpenVendorReorders() {
  try {
    const ctx = await requireSiteContext();
    return stockMovementService.listOpenVendorReorders(ctx.siteId);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
