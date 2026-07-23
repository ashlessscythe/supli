import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { vendorService } from "@/server/services/vendor.service";

async function getAdminContext() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await vendorService.listItems(ctx.siteId, params.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = await vendorService.linkItem(
      params.id,
      ctx.userId,
      ctx.siteId,
      json
    );
    if (!result.success) {
      const status =
        typeof result.error === "string" &&
        (result.error.includes("not found") ||
          result.error.includes("already linked"))
          ? 400
          : 500;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = await vendorService.updateItemLink(
      params.id,
      ctx.userId,
      ctx.siteId,
      json
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const supplyId = json?.supplyId;
    if (!supplyId || typeof supplyId !== "string") {
      return NextResponse.json(
        { error: "supplyId is required" },
        { status: 400 }
      );
    }

    const result = await vendorService.unlinkItem(
      params.id,
      supplyId,
      ctx.userId,
      ctx.siteId
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
