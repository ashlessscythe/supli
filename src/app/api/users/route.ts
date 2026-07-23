import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { userService } from "@/server/services/user.service";
import { userSchema, userUpdateSchema } from "@/lib/validation/user";
import { z } from "zod";

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const result = await userService.list(ctx.siteId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const json = await request.json();
    const data = userSchema.parse(json);
    const result = await userService.create(ctx.userId, ctx.siteId, data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message === "No active site selected")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAdmin();
    const json = await request.json();
    const data = userUpdateSchema.parse(json);
    const result = await userService.update(ctx.userId, ctx.siteId, data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message === "No active site selected")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const result = await userService.delete(ctx.userId, ctx.siteId, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
