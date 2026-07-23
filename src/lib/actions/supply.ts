"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { supplyService } from "@/server/services/supply.service";
import type {
  SupplyInput,
  SupplyStaffUpdateInput,
} from "@/lib/validation/supply";

export async function createSupply(formData: SupplyInput) {
  try {
    const ctx = await requireAdmin();
    const result = await supplyService.create(ctx.userId, ctx.siteId, formData);
    if (result.success) {
      revalidatePath("/dashboard/supplies");
      revalidatePath("/admin/supplies");
      revalidatePath("/admin/inbound");
      revalidatePath("/dashboard/inbound");
    }
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateSupply(
  id: string,
  formData: SupplyInput | SupplyStaffUpdateInput
) {
  try {
    const ctx = await requireSiteContext();
    const isAdmin =
      ctx.role === Role.ADMIN || ctx.role === Role.SUPERADMIN;

    const result = isAdmin
      ? await supplyService.update(
          ctx.userId,
          ctx.siteId,
          id,
          formData as SupplyInput
        )
      : await supplyService.updateByStaff(
          ctx.userId,
          ctx.siteId,
          id,
          formData as SupplyStaffUpdateInput
        );

    if (result.success) revalidatePath("/dashboard/supplies");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function deleteSupply(id: string) {
  try {
    const ctx = await requireAdmin();
    const result = await supplyService.delete(ctx.userId, ctx.siteId, id);
    if (result.success) revalidatePath("/dashboard/supplies");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateQuantity(id: string, quantity: number) {
  try {
    const ctx = await requireSiteContext();
    const result = await supplyService.updateQuantity(
      ctx.userId,
      ctx.siteId,
      id,
      quantity
    );
    if (result.success) revalidatePath("/dashboard/supplies");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getSupplies() {
  try {
    const ctx = await requireSiteContext();
    return supplyService.list(ctx.siteId);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getSupply(id: string) {
  try {
    const ctx = await requireSiteContext();
    return supplyService.getById(ctx.siteId, id);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
