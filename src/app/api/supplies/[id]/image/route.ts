import { NextResponse } from "next/server";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { getKioskSite, isKioskAuthenticated } from "@/lib/kiosk";
import { supplyImageService } from "@/server/services/supply-image.service";

/**
 * Serve a supply image via short-lived signed R2 GET.
 *
 * Approach: 302 redirect to a presigned URL (never stored in the DB).
 * Catalog/HTML always use this stable same-origin path, so cached pages
 * and the PWA never hold expired R2 URLs. The service worker treats this
 * route as NetworkOnly; Cache-Control on the redirect is short so browsers
 * re-fetch a fresh signature well before the signed URL expires.
 *
 * Auth: site session (any role with site context) OR kiosk session for
 * the same site.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let siteId: string | null = null;
  try {
    const ctx = await requireSiteContext();
    siteId = ctx.siteId;
  } catch {
    if (await isKioskAuthenticated()) {
      const site = await getKioskSite();
      siteId = site?.id ?? null;
    }
  }

  if (!siteId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await supplyImageService.getSignedViewUrl(siteId, id);
  if (!result.success) {
    const status = result.error === "Supply not found" ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  if (!result.data) {
    return NextResponse.json({ error: "No image" }, { status: 404 });
  }

  const response = NextResponse.redirect(result.data.url, 302);
  // Keep redirect cache shorter than signed URL lifetime (15m).
  response.headers.set(
    "Cache-Control",
    "private, max-age=60, stale-while-revalidate=30"
  );
  if (result.data.contentType) {
    response.headers.set("X-Content-Type-Hint", result.data.contentType);
  }
  return response;
}

/** Admin-only: remove the image from the DB and best-effort delete from R2. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    const result = await supplyImageService.remove(ctx.siteId, id);
    if (!result.success) {
      const status = result.error === "Supply not found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
