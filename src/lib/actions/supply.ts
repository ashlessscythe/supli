"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getIO } from "@/lib/socket";

const supplySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z.number().min(0, "Minimum threshold must be 0 or greater"),
});

type SupplyFormData = z.infer<typeof supplySchema>;

async function notifyLowInventory(supply: { name: string; quantity: number }) {
  try {
    const io = getIO();
    io.emit("notification", {
      type: "low-inventory",
      message: `Low stock alert: ${supply.name} has only ${supply.quantity} units remaining`,
    });
  } catch (error) {
    console.error("Error sending low inventory notification:", error);
  }
}

export async function createSupply(formData: SupplyFormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const validatedData = supplySchema.parse(formData);

    const supply = await prisma.supply.create({
      data: validatedData,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Created supply: ${supply.name}`,
      },
    });

    if (supply.quantity <= supply.minimumThreshold) {
      await notifyLowInventory(supply);
    }

    revalidatePath("/dashboard/supplies");
    return { success: true, data: supply };
  } catch (error) {
    console.error("Error creating supply:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors };
    }
    return { success: false, error: "Failed to create supply" };
  }
}

export async function updateSupply(id: string, formData: SupplyFormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const validatedData = supplySchema.parse(formData);

    const supply = await prisma.supply.update({
      where: { id },
      data: validatedData,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Updated supply: ${supply.name}`,
      },
    });

    if (supply.quantity <= supply.minimumThreshold) {
      await notifyLowInventory(supply);
    }

    revalidatePath("/dashboard/supplies");
    return { success: true, data: supply };
  } catch (error) {
    console.error("Error updating supply:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors };
    }
    return { success: false, error: "Failed to update supply" };
  }
}

export async function deleteSupply(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    // Check for pending requests
    const pendingRequests = await prisma.request.findFirst({
      where: {
        supplyId: id,
        status: "PENDING",
      },
    });

    if (pendingRequests) {
      return {
        success: false,
        error: "Cannot delete supply with pending requests",
      };
    }

    const supply = await prisma.supply.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Deleted supply: ${supply.name}`,
      },
    });

    revalidatePath("/dashboard/supplies");
    return { success: true, data: supply };
  } catch (error) {
    console.error("Error deleting supply:", error);
    return { success: false, error: "Failed to delete supply" };
  }
}

export async function updateQuantity(id: string, quantity: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    if (quantity < 0) {
      return {
        success: false,
        error: "Quantity cannot be negative",
      };
    }

    const supply = await prisma.supply.update({
      where: { id },
      data: { quantity },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Updated quantity for ${supply.name} to ${quantity}`,
      },
    });

    if (supply.quantity <= supply.minimumThreshold) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: `Low stock alert for ${supply.name} (${supply.quantity} remaining)`,
        },
      });
      await notifyLowInventory(supply);
    }

    revalidatePath("/dashboard/supplies");
    return { success: true, data: supply };
  } catch (error) {
    console.error("Error updating supply quantity:", error);
    return { success: false, error: "Failed to update quantity" };
  }
}

export async function getSupplies() {
  try {
    const supplies = await prisma.supply.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return { success: true, data: supplies };
  } catch (error) {
    console.error("Error fetching supplies:", error);
    return { success: false, error: "Failed to fetch supplies" };
  }
}

export async function getSupply(id: string) {
  try {
    const supply = await prisma.supply.findUnique({
      where: { id },
      include: {
        requests: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!supply) {
      return { success: false, error: "Supply not found" };
    }

    return { success: true, data: supply };
  } catch (error) {
    console.error("Error fetching supply:", error);
    return { success: false, error: "Failed to fetch supply" };
  }
}
