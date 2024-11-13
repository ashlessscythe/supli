import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/supplies/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supply = await prisma.supply.findUnique({
      where: { id: params.id },
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
          take: 5, // Get only the 5 most recent requests
        },
      },
    });

    if (!supply) {
      return NextResponse.json({ error: "Supply not found" }, { status: 404 });
    }

    return NextResponse.json(supply);
  } catch (error) {
    console.error("Error fetching supply:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/supplies/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { quantity } = json;

    if (typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Quantity must be a number" },
        { status: 400 }
      );
    }

    if (quantity < 0) {
      return NextResponse.json(
        { error: "Quantity cannot be negative" },
        { status: 400 }
      );
    }

    const supply = await prisma.supply.update({
      where: { id: params.id },
      data: { quantity },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Updated quantity for ${supply.name} to ${quantity}`,
      },
    });

    // Check if we need to create a notification for low stock
    if (supply.quantity <= supply.minimumThreshold) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: `Low stock alert for ${supply.name} (${supply.quantity} remaining)`,
        },
      });
    }

    return NextResponse.json(supply);
  } catch (error) {
    console.error("Error updating supply quantity:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
