"use server";

import { requireSiteContext } from "@/lib/auth/session";
import { adminService } from "@/server/services/admin.service";

export async function getReceiptsChartData() {
  try {
    const ctx = await requireSiteContext();
    return adminService.getReceiptsChartData(ctx.siteId);
  } catch {
    return [];
  }
}

export async function getSupplyChartData() {
  try {
    const ctx = await requireSiteContext();
    return adminService.getSupplyChartData(ctx.siteId);
  } catch {
    return [];
  }
}

export async function getStats() {
  try {
    const ctx = await requireSiteContext();
    return adminService.getStats(ctx.siteId);
  } catch {
    return {
      totalUsers: 0,
      totalSupplies: 0,
      lowStockItems: 0,
    };
  }
}

export async function getLowStockItems(limit = 5) {
  try {
    const ctx = await requireSiteContext();
    return adminService.getLowStockItems(ctx.siteId, limit);
  } catch {
    return [];
  }
}
