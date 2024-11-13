import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema for supply validation
const supplySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z.number().min(0, "Minimum threshold must be 0 or greater"),
});

// GET /api/supplies
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supplies = await prisma.supply.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(supplies);
  } catch (error) {
    console.error("Error fetching supplies:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/supplies
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const validatedData = supplySchema.parse(json);

    const supply = await prisma.supply.create({
      data: validatedData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Created supply: ${supply.name}`,
      },
    });

    return NextResponse.json(supply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("Error creating supply:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/supplies
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { id, ...data } = json;

    if (!id) {
      return NextResponse.json(
        { error: "Supply ID is required" },
        { status: 400 }
      );
    }

    const validatedData = supplySchema.parse(data);

    const supply = await prisma.supply.update({
      where: { id },
      data: validatedData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Updated supply: ${supply.name}`,
      },
    });

    return NextResponse.json(supply);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("Error updating supply:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/supplies
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Supply ID is required" },
        { status: 400 }
      );
    }

    // Check if there are any pending requests for this supply
    const pendingRequests = await prisma.request.findFirst({
      where: {
        supplyId: id,
        status: "PENDING",
      },
    });

    if (pendingRequests) {
      return NextResponse.json(
        { error: "Cannot delete supply with pending requests" },
        { status: 400 }
      );
    }

    const supply = await prisma.supply.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Deleted supply: ${supply.name}`,
      },
    });

    return NextResponse.json(supply);
  } catch (error) {
    console.error("Error deleting supply:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
