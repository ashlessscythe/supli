"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { supplyService } from "@/server/services/supply.service";
import type {
  SupplyInput,
  SupplyStaffUpdateInput,
} from "@/lib/validation/supply";

export async function createSupply(formData: SupplyInput) {
  try {
    const session = await requireAdmin();
    const result = await supplyService.create(session.user.id, formData);
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
    const session = await requireSession();

    const result =
      session.user.role === Role.ADMIN
        ? await supplyService.update(
            session.user.id,
            id,
            formData as SupplyInput
          )
        : await supplyService.updateByStaff(
            session.user.id,
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
    const session = await requireAdmin();
    const result = await supplyService.delete(session.user.id, id);
    if (result.success) revalidatePath("/dashboard/supplies");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateQuantity(id: string, quantity: number) {
  try {
    const session = await requireSession();
    const result = await supplyService.updateQuantity(
      session.user.id,
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
  return supplyService.list();
}

export async function getSupply(id: string) {
  return supplyService.getById(id);
}
