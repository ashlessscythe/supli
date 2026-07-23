import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { userService } from "@/server/services/user.service";

const bodySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin();
    const json = await request.json();
    const { userId } = bodySchema.parse(json);
    const result = await userService.approveRegistration(
      ctx.userId,
      userId,
      ctx.siteId
    );

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
