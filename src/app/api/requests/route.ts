import { NextResponse } from "next/server";
import { Role, RequestStatus } from "@prisma/client";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { requestService } from "@/server/services/request.service";
import { requestSchema } from "@/lib/validation/request";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const ctx = await requireSiteContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as RequestStatus | null;
    const userId = searchParams.get("userId");

    const result = await requestService.list(ctx.userId, ctx.siteId, ctx.role);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    let requests = result.data;
    if (status) {
      requests = requests.filter((r) => r.status === status);
    }
    if (
      userId &&
      (ctx.role === Role.ADMIN || ctx.role === Role.SUPERADMIN)
    ) {
      requests = requests.filter((r) => r.userId === userId);
    }

    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireSiteContext();
    const json = await request.json();
    const data = requestSchema.parse(json);
    const result = await requestService.create(ctx.userId, ctx.siteId, data);
    if (!result.success) {
      const status = result.error === "Supply not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
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
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const result = await requestService.updateStatus(
      ctx.userId,
      ctx.siteId,
      id,
      status as RequestStatus
    );

    if (!result.success) {
      const code = result.error === "Request not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status: code });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
