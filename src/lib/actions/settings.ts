"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { settingsService } from "@/server/services/settings.service";
import type { SettingInput } from "@/lib/validation/settings";

export async function getSystemSetting(key: string) {
  try {
    const ctx = await requireSiteContext();
    return settingsService.getSetting(ctx.siteId, key);
  } catch {
    return null;
  }
}

export async function getAllSettings() {
  try {
    const ctx = await requireAdmin();
    return settingsService.list(ctx.siteId);
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateSettings(settings: SettingInput[]) {
  try {
    const ctx = await requireAdmin();
    const result = await settingsService.update(
      ctx.userId,
      ctx.siteId,
      settings
    );
    if (result.success) revalidatePath("/admin/settings");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateKioskPassword(password: string) {
  try {
    const ctx = await requireAdmin();
    const result = await settingsService.setKioskPassword(
      ctx.userId,
      ctx.siteId,
      password
    );
    if (result.success) revalidatePath("/admin/settings");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function shouldShowAllRequests() {
  try {
    const ctx = await requireSiteContext();
    return settingsService.shouldShowAllRequests(ctx.siteId);
  } catch {
    return false;
  }
}

export async function getMaxRequestQuantity() {
  try {
    const ctx = await requireSiteContext();
    return settingsService.getMaxRequestQuantity(ctx.siteId);
  } catch {
    return 100;
  }
}

export async function getLowStockThreshold() {
  try {
    const ctx = await requireSiteContext();
    return settingsService.getLowStockThreshold(ctx.siteId);
  } catch {
    return 5;
  }
}
