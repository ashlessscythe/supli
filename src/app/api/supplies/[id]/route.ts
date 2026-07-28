import { NextResponse } from "next/server";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { supplyService } from "@/server/services/supply.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSiteContext();
    const { id } = await params;
    const result = await supplyService.getById(ctx.siteId, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const { quantity } = await request.json();
    if (typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Quantity must be a number" },
        { status: 400 }
      );
    }

    const result = await supplyService.updateQuantity(
      ctx.userId,
      ctx.siteId,
      id,
      quantity
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
