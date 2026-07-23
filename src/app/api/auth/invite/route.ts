import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { userService } from "@/server/services/user.service";
import { inviteSchema } from "@/lib/validation/user";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const json = await request.json();
    const data = inviteSchema.parse(json);
    const result = await userService.invite(ctx.userId, ctx.siteId, data);
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
