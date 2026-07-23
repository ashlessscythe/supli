import { NextResponse } from "next/server";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { supplyService } from "@/server/services/supply.service";
import { supplySchema } from "@/lib/validation/supply";
import { z } from "zod";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function handleResult<T>(result: {
  success: boolean;
  data?: T;
  error?: unknown;
}) {
  if (!result.success) {
    const status =
      typeof result.error === "string" && result.error.includes("not found")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result.data);
}

export async function GET() {
  try {
    const ctx = await requireSiteContext();
    const result = await supplyService.list(ctx.siteId);
    return handleResult(result);
  } catch {
    return unauthorized();
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const json = await request.json();
    const data = supplySchema.parse(json);
    const result = await supplyService.create(ctx.userId, ctx.siteId, data);
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
      return unauthorized();
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
    const { id, ...data } = json;
    if (!id) {
      return NextResponse.json(
        { error: "Supply ID is required" },
        { status: 400 }
      );
    }
    const validated = supplySchema.parse(data);
    const result = await supplyService.update(
      ctx.userId,
      ctx.siteId,
      id,
      validated
    );
    return handleResult(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message === "No active site selected")
    ) {
      return unauthorized();
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
        { error: "Supply ID is required" },
        { status: 400 }
      );
    }

    const result = await supplyService.delete(ctx.userId, ctx.siteId, id);
    return handleResult(result);
  } catch {
    return unauthorized();
  }
}
