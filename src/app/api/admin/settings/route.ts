import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { settingsService } from "@/server/services/settings.service";
import { settingsSchema } from "@/lib/validation/settings";
import { z } from "zod";

export async function GET() {
  try {
    const ctx = await requireAdmin();
    const result = await settingsService.list(ctx.siteId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireAdmin();
    const json = await request.json();
    const data = settingsSchema.parse(json);
    const result = await settingsService.update(ctx.userId, ctx.siteId, data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
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
