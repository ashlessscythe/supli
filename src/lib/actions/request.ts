"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { RequestStatus } from "@prisma/client";
import { shouldShowAllRequests } from "@/lib/actions/settings";

const requestSchema = z.object({
  supplyId: z.string().min(1, "Supply ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export async function createRequest(formData: RequestFormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const validatedData = requestSchema.parse(formData);

    // Check if supply exists and has enough quantity
    const supply = await prisma.supply.findUnique({
      where: { id: validatedData.supplyId },
    });

    if (!supply) {
      return { success: false, error: "Supply not found" };
    }

    if (validatedData.quantity > supply.quantity) {
      return {
        success: false,
        error: "Requested quantity exceeds available stock",
      };
    }

    const request = await prisma.request.create({
      data: {
        userId: session.user.id,
        supplyId: validatedData.supplyId,
        quantity: validatedData.quantity,
        status: "PENDING",
      },
      include: {
        supply: {
          select: {
            name: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Created request for ${validatedData.quantity} ${supply.name}`,
      },
    });

    revalidatePath("/dashboard/requests");
    return { success: true, data: request };
  } catch (error) {
    console.error("Error creating request:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors };
    }
    return { success: false, error: "Failed to create request" };
  }
}

export async function updateRequestStatus(id: string, status: RequestStatus) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    // Get the request with supply details
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        supply: true,
      },
    });

    if (!existingRequest) {
      return { success: false, error: "Request not found" };
    }

    if (existingRequest.status !== "PENDING") {
      return {
        success: false,
        error: "Request has already been processed",
      };
    }

    // If approving, check if supply has enough quantity
    if (status === "APPROVED") {
      if (existingRequest.quantity > existingRequest.supply.quantity) {
        return {
          success: false,
          error: "Insufficient supply quantity",
        };
      }

      // Update supply quantity
      await prisma.supply.update({
        where: { id: existingRequest.supplyId },
        data: {
          quantity: {
            decrement: existingRequest.quantity,
          },
        },
      });
    }

    // Update request status
    const request = await prisma.request.update({
      where: { id },
      data: { status },
      include: {
        supply: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `${status} request for ${existingRequest.quantity} ${existingRequest.supply.name}`,
      },
    });

    revalidatePath("/dashboard/requests");
    return { success: true, data: request };
  } catch (error) {
    console.error("Error updating request:", error);
    return { success: false, error: "Failed to update request" };
  }
}

export async function getRequests() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const showAllRequests = await shouldShowAllRequests();

    const where =
      session.user.role !== "ADMIN" && !showAllRequests
        ? { userId: session.user.id }
        : {};

    const requests = await prisma.request.findMany({
      where,
      include: {
        supply: {
          select: {
            name: true,
            quantity: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error fetching requests:", error);
    return { success: false, error: "Failed to fetch requests" };
  }
}

export async function getRequest(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const showAllRequests = await shouldShowAllRequests();

    const where = {
      id,
      ...(session.user.role !== "ADMIN" &&
        !showAllRequests && {
          userId: session.user.id,
        }),
    };

    const request = await prisma.request.findFirst({
      where,
      include: {
        supply: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    return { success: true, data: request };
  } catch (error) {
    console.error("Error fetching request:", error);
    return { success: false, error: "Failed to fetch request" };
  }
}
