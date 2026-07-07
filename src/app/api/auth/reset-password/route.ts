import { NextResponse } from "next/server";
import { userService } from "@/server/services/user.service";
import { resetPasswordSchema } from "@/lib/validation/user";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = resetPasswordSchema.parse(json);
    const result = await userService.resetPassword(data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
