"use server";

import { revalidatePath } from "next/cache";
import { RequestStatus } from "@prisma/client";
import { requireAdmin, requireSession } from "@/lib/auth/session";
import { requestService } from "@/server/services/request.service";
import type { RequestInput } from "@/lib/validation/request";

export async function createRequest(formData: RequestInput) {
  try {
    const session = await requireSession();
    const result = await requestService.create(session.user.id, formData);
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
    const session = await requireAdmin();
    const result = await requestService.updateStatus(
      session.user.id,
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
    const session = await requireSession();
    return requestService.list(session.user.id, session.user.role);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function getRequest(id: string) {
  try {
    const session = await requireSession();
    return requestService.getById(session.user.id, session.user.role, id);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
