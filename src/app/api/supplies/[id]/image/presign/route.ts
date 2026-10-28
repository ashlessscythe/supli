import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { supplyImageService } from "@/server/services/supply-image.service";

type PresignBody = {
  contentType?: unknown;
  contentLength?: unknown;
};

/**
 * Admin-only: issue a constrained presigned PUT for direct browser → R2 upload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as PresignBody;

    const contentType =
      typeof body.contentType === "string" ? body.contentType : "";
    const contentLength =
      typeof body.contentLength === "number" ? body.contentLength : NaN;

    const result = await supplyImageService.createUploadUrl(ctx.siteId, id, {
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
