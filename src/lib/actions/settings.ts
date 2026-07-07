"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { settingsService } from "@/server/services/settings.service";
import type { SettingInput } from "@/lib/validation/settings";

export async function getSystemSetting(key: string) {
  return settingsService.getSetting(key);
}

export async function getAllSettings() {
  try {
    await requireAdmin();
    return settingsService.list();
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateSettings(settings: SettingInput[]) {
  try {
    const session = await requireAdmin();
    const result = await settingsService.update(session.user.id, settings);
    if (result.success) revalidatePath("/admin/settings");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function updateKioskPassword(password: string) {
  try {
    const session = await requireAdmin();
    const result = await settingsService.setKioskPassword(
      session.user.id,
      password
    );
    if (result.success) revalidatePath("/admin/settings");
    return result;
  } catch {
    return { success: false as const, error: "Unauthorized" };
  }
}

export async function shouldShowAllRequests() {
  return settingsService.shouldShowAllRequests();
}

export async function getMaxRequestQuantity() {
  return settingsService.getMaxRequestQuantity();
}

export async function getLowStockThreshold() {
  return settingsService.getLowStockThreshold();
}
