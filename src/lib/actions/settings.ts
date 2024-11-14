"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSystemSetting(key: string) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

export async function getAllSettings() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: {
        key: "asc",
      },
    });

    return { success: true, data: settings };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return { success: false, error: "Failed to fetch settings" };
  }
}

export async function updateSettings(
  settings: {
    id: string;
    key: string;
    value: string;
    description: string;
  }[]
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    // Update settings in a transaction
    await prisma.$transaction(
      settings.map((setting) =>
        prisma.systemSetting.update({
          where: { id: setting.id },
          data: {
            value: setting.value,
          },
        })
      )
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "Updated system settings",
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

// Helper function to check if all requests should be visible
export async function shouldShowAllRequests() {
  const value = await getSystemSetting("ALLOW_ALL_REQUESTS_VISIBLE");
  return value === "true";
}

// Helper function to get max request quantity
export async function getMaxRequestQuantity() {
  const value = await getSystemSetting("MAX_REQUEST_QUANTITY");
  return value ? parseInt(value, 10) : 100; // Default to 100 if not set
}

// Helper function to get low stock threshold
export async function getLowStockThreshold() {
  const value = await getSystemSetting("LOW_STOCK_THRESHOLD_WARNING");
  return value ? parseInt(value, 10) : 5; // Default to 5 if not set
}
