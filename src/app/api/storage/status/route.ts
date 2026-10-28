import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { isR2Configured } from "@/server/storage/r2";

/**
 * Admin-only: whether private R2 object storage is configured.
 * Used to hide the upload UI when storage is unavailable.
 */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ configured: isR2Configured() });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
