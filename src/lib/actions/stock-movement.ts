"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSession } from "@/lib/auth/session";
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
    const session = await requireSession();
    const result = await stockMovementService.receive(session.user.id, input);
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function adjustStock(input: AdjustStockInput) {
  try {
    const session = await requireAdmin();
    const result = await stockMovementService.adjust(session.user.id, input);
    if (result.success) revalidateInventoryPaths();
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function checkoutSupplies(input: BulkConsumeInput) {
  try {
    const session = await requireSession();
    const result = await stockMovementService.consumeBulk(
      session.user.id,
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
    await requireSession();
    return stockMovementService.listReceipts();
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getLocations() {
  try {
    await requireSession();
    return locationService.list();
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function logVendorReorder(input: LogVendorReorderInput) {
  try {
    const session = await requireSession();
    const result = await stockMovementService.logVendorReorder(
      session.user.id,
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
    const session = await requireSession();
    const result = await stockMovementService.updateVendorReorder(
      session.user.id,
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
    await requireSession();
    return stockMovementService.getCheckoutStockLevels(locationId, supplyIds);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getOpenVendorReorders() {
  try {
    await requireSession();
    return stockMovementService.listOpenVendorReorders();
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
