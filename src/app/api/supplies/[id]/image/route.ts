import { NextResponse } from "next/server";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { getKioskSite, isKioskAuthenticated } from "@/lib/kiosk";
import { supplyImageService } from "@/server/services/supply-image.service";

/**
 * Serve a supply image via a short-lived signed R2 GET, proxied same-origin.
 *
 * Approach: authenticated route fetches from a presigned URL server-side and
 * streams bytes to the client. Catalog/HTML always use this stable path, so
 * cached pages and the PWA never embed expired R2 URLs. The service worker
 * treats this route as NetworkOnly; Cache-Control is shorter than the signed
 * URL lifetime so browsers refresh before signatures expire.
 *
 * Proxy (vs 302 redirect) keeps signed URLs off the client, works with
 * next/image without remotePatterns, and avoids browser→R2 CORS issues for
 * locked-down / local S3 stand-ins. Kiosk tiles stay same-origin.
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

  try {
    const upstream = await fetch(result.data.url);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 502 }
      );
    }

    const contentType =
      result.data.contentType ||
      upstream.headers.get("Content-Type") ||
      "application/octet-stream";
    const contentLength = upstream.headers.get("Content-Length");

    const headers = new Headers({
      "Content-Type": contentType,
      // Shorter than signed GET lifetime (15m).
      "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
    });
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 }
    );
  }
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
