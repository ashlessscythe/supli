"use server";

import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function getOverviewData() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const requests = await prisma.request.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo,
        lte: now,
      },
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      month: format(date, "MMM"),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  }).reverse();

  const data = months.map((month) => {
    const monthRequests = requests.filter(
      (request) =>
        request.createdAt >= month.start && request.createdAt <= month.end
    );

    return {
      name: month.month,
      total: monthRequests.length,
      approved: monthRequests.filter((r) => r.status === "APPROVED").length,
      denied: monthRequests.filter((r) => r.status === "DENIED").length,
      pending: monthRequests.filter((r) => r.status === "PENDING").length,
    };
  });

  return data;
}

export async function getRequestsChartData() {
  const requests = await prisma.request.findMany({
    select: {
      status: true,
    },
  });

  const data = [
    {
      name: "Approved",
      value: requests.filter((r) => r.status === "APPROVED").length,
      color: "#22c55e",
      darkColor: "#84cc16",
    },
    {
      name: "Denied",
      value: requests.filter((r) => r.status === "DENIED").length,
      color: "#dc2626",
      darkColor: "#ef4444",
    },
    {
      name: "Pending",
      value: requests.filter((r) => r.status === "PENDING").length,
      color: "#eab308",
      darkColor: "#facc15",
    },
  ].filter((item) => item.value > 0);

  return data;
}

type SupplyStatus = "Low" | "OK";

export async function getSupplyChartData() {
  const supplies = await prisma.supply.findMany({
    select: {
      name: true,
      quantity: true,
      minimumThreshold: true,
    },
    orderBy: {
      quantity: "asc",
    },
    take: 10, // Show top 10 supplies
  });

  return supplies.map((supply) => ({
    name: supply.name,
    quantity: supply.quantity,
    threshold: supply.minimumThreshold,
    status:
      supply.quantity <= supply.minimumThreshold
        ? ("Low" as const)
        : ("OK" as const),
  }));
}
