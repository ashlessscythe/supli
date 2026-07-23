import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { locationService } from "@/server/services/location.service";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireAdmin();
    const result = await locationService.listStockItems(ctx.siteId, params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
