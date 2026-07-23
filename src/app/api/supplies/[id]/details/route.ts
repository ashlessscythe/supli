import { NextResponse } from "next/server";
import { requireSiteContext } from "@/lib/auth/session";
import { supplyService } from "@/server/services/supply.service";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireSiteContext();
    const result = await supplyService.getDetails(ctx.siteId, params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
