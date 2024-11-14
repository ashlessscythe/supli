import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";

// Schema for user validation
const userSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([Role.ADMIN, Role.STAFF]),
});

// GET /api/users
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            requests: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const validatedData = userSchema.parse(json);

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        password: hashedPassword,
        role: validatedData.role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Created user: ${user.username}`,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/users
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { id, ...data } = json;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Don't allow changing the last admin's role
    if (data.role === Role.STAFF) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      });
      const user = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });
      if (adminCount === 1 && user?.role === Role.ADMIN) {
        return NextResponse.json(
          { error: "Cannot change role of the last admin" },
          { status: 400 }
        );
      }
    }

    // If password is provided, hash it
    let updateData: any = {
      username: data.username,
      role: data.role,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Updated user: ${user.username}`,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Don't allow deleting the last admin
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true, username: true },
    });

    if (user?.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      });

      if (adminCount === 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin" },
          { status: 400 }
        );
      }
    }

    // Delete the user
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `Deleted user: ${user?.username}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
