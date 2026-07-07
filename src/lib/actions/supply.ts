"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { supplyService } from "@/server/services/supply.service";
import type { SupplyInput } from "@/lib/validation/supply";

export async function createSupply(formData: SupplyInput) {
  try {
    const session = await requireAdmin();
    const result = await supplyService.create(session.user.id, formData);
    if (result.success) revalidatePath("/dashboard/supplies");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateSupply(id: string, formData: SupplyInput) {
  try {
    const session = await requireAdmin();
    const result = await supplyService.update(session.user.id, id, formData);
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
    const session = await requireAdmin();
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
