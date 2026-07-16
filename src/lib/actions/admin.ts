"use server";

import { adminService } from "@/server/services/admin.service";

export async function getReceiptsChartData() {
  return adminService.getReceiptsChartData();
}

export async function getSupplyChartData() {
  return adminService.getSupplyChartData();
}

export async function getStats() {
  return adminService.getStats();
}

export async function getLowStockItems(limit = 5) {
  return adminService.getLowStockItems(limit);
}
