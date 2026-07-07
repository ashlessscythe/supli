import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { userService } from "@/server/services/user.service";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const result = await userService.verifyEmail(token);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  redirect("/login?verified=1");
}
