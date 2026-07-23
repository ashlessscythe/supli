"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";
import { env } from "@/lib/env";
import { siteService } from "@/server/services/site.service";

export async function switchActiveSite(siteId: string) {
  try {
    await requireSuperAdmin();
    const result = await siteService.getById(siteId);
    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    cookies().set(ACTIVE_SITE_COOKIE, siteId, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
    });

    revalidatePath("/admin");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function clearActiveSite() {
  try {
    await requireSuperAdmin();
    cookies().delete(ACTIVE_SITE_COOKIE);
    revalidatePath("/admin");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function listSites() {
  try {
    await requireSuperAdmin();
    return siteService.list();
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function listActiveSites() {
  return siteService.listActive();
}

export async function createSite(input: {
  name: string;
  slug: string;
  isActive?: boolean;
}) {
  try {
    const session = await requireSuperAdmin();
    const result = await siteService.create(session.user.id, input);
    if (result.success) revalidatePath("/admin/sites");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateSite(
  id: string,
  fields: { name?: string; slug?: string; isActive?: boolean }
) {
  try {
    const session = await requireSuperAdmin();
    const result = await siteService.update(session.user.id, id, fields);
    if (result.success) revalidatePath("/admin/sites");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function deleteSite(id: string) {
  try {
    const session = await requireSuperAdmin();
    const result = await siteService.delete(session.user.id, id);
    if (result.success) revalidatePath("/admin/sites");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function assignUserToSite(
  userId: string,
  siteId: string,
  role?: "ADMIN" | "STAFF" | "PENDING"
) {
  try {
    const session = await requireSuperAdmin();
    const result = await siteService.assignUser(
      session.user.id,
      userId,
      siteId,
      role
    );
    if (result.success) {
      revalidatePath("/admin/sites");
      revalidatePath("/admin/users");
    }
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}
