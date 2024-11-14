import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { RequestStatus } from "@prisma/client";
import { shouldShowAllRequests } from "@/lib/actions/settings";

// Schema for request validation
const requestSchema = z.object({
  supplyId: z.string().min(1, "Supply ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

// GET /api/requests
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as RequestStatus | null;
    const userId = searchParams.get("userId");

    // Check if all requests should be visible
    const allRequestsVisible = await shouldShowAllRequests();

    // Build query based on role, settings, and filters
    const where = {
      ...(status && { status: status as RequestStatus }),
      ...(!allRequestsVisible &&
        session.user.role !== "ADMIN" && { userId: session.user.id }),
      ...(userId && session.user.role === "ADMIN" && { userId }),
    };

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

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/requests
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const validatedData = requestSchema.parse(json);

    // Check if supply exists and has enough quantity
    const supply = await prisma.supply.findUnique({
      where: { id: validatedData.supplyId },
    });

    if (!supply) {
      return NextResponse.json({ error: "Supply not found" }, { status: 404 });
    }

    if (validatedData.quantity > supply.quantity) {
      return NextResponse.json(
        { error: "Requested quantity exceeds available stock" },
        { status: 400 }
      );
    }

    // Create request
    const newRequest = await prisma.request.create({
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
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Created request for ${validatedData.quantity} ${supply.name}`,
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/requests
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { id, status } = json;

    if (!id || !status || !["APPROVED", "DENIED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Get the request with supply details
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      include: {
        supply: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request has already been processed" },
        { status: 400 }
      );
    }

    // If approving, check if supply has enough quantity
    if (status === "APPROVED") {
      if (existingRequest.quantity > existingRequest.supply.quantity) {
        return NextResponse.json(
          { error: "Insufficient supply quantity" },
          { status: 400 }
        );
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
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: { status: status as RequestStatus },
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `${status} request for ${existingRequest.quantity} ${existingRequest.supply.name}`,
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
