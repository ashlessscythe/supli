"use server";

import { revalidatePath } from "next/cache";
import { RequestStatus } from "@prisma/client";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { requestService } from "@/server/services/request.service";
import type { RequestInput } from "@/lib/validation/request";

export async function createRequest(formData: RequestInput) {
  try {
    const ctx = await requireSiteContext();
    const result = await requestService.create(ctx.userId, ctx.siteId, formData);
    if (result.success) {
      revalidatePath("/dashboard/inbound");
      revalidatePath("/admin/inbound");
    }
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  try {
    const ctx = await requireAdmin();
    const result = await requestService.updateStatus(
      ctx.userId,
      ctx.siteId,
      id,
      status
    );
    if (result.success) {
      revalidatePath("/dashboard/inbound");
      revalidatePath("/admin/inbound");
    }
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getRequests() {
  try {
    const ctx = await requireSiteContext();
    return requestService.list(ctx.userId, ctx.siteId, ctx.role);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getRequest(id: string) {
  try {
    const ctx = await requireSiteContext();
    return requestService.getById(ctx.userId, ctx.siteId, ctx.role, id);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
