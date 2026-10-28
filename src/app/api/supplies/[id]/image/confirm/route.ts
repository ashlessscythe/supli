import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { supplyImageService } from "@/server/services/supply-image.service";

type ConfirmBody = {
  key?: unknown;
  contentType?: unknown;
  contentLength?: unknown;
};

/**
 * Admin-only: after a successful browser PUT to R2, persist the object key
 * (never a URL) and best-effort delete any previous object.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as ConfirmBody;

    const key = typeof body.key === "string" ? body.key : "";
    const contentType =
      typeof body.contentType === "string" ? body.contentType : "";
    const contentLength =
      typeof body.contentLength === "number" ? body.contentLength : NaN;

    const result = await supplyImageService.confirmUpload(ctx.siteId, id, {
      key,
      contentType,
      contentLength,
    });

    if (!result.success) {
      const status =
        result.error === "Supply not found"
          ? 404
          : result.error === "Object storage is not configured"
            ? 503
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
