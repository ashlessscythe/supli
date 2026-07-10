"use server";

import { adminService } from "@/server/services/admin.service";

export async function getOverviewData() {
  return adminService.getOverviewData();
}

export async function getRequestsChartData() {
  return adminService.getRequestsChartData();
}

export async function getReceiptsChartData() {
  return adminService.getReceiptsChartData();
}

export async function getSupplyChartData() {
  return adminService.getSupplyChartData();
}

export async function getStats() {
  return adminService.getStats();
}
