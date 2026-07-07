import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supplyService } from "@/server/services/supply.service";
import { supplySchema } from "@/lib/validation/supply";
import { z } from "zod";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function handleResult<T>(result: { success: boolean; data?: T; error?: unknown }) {
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
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();
  const result = await supplyService.list();
  return handleResult(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return unauthorized();

  try {
    const json = await request.json();
    const data = supplySchema.parse(json);
    const result = await supplyService.create(session.user.id, data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return unauthorized();

  try {
    const json = await request.json();
    const { id, ...data } = json;
    if (!id) {
      return NextResponse.json({ error: "Supply ID is required" }, { status: 400 });
    }
    const validated = supplySchema.parse(data);
    const result = await supplyService.update(session.user.id, id, validated);
    return handleResult(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Supply ID is required" }, { status: 400 });
  }

  const result = await supplyService.delete(session.user.id, id);
  return handleResult(result);
}
