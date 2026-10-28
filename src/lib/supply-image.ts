/** Max upload size enforced client- and server-side (5 MiB). */
export const MAX_SUPPLY_IMAGE_BYTES = 5 * 1024 * 1024;

/** Long-edge target after browser resize (WebP). */
export const SUPPLY_IMAGE_LONG_EDGE_PX = 1024;

/** Allowed Content-Type values for supply images. */
export const SUPPLY_IMAGE_MIME_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
] as const;

export type SupplyImageMimeType = (typeof SUPPLY_IMAGE_MIME_TYPES)[number];

const MIME_SET = new Set<string>(SUPPLY_IMAGE_MIME_TYPES);

export function isAllowedSupplyImageMime(
  mimeType: string | null | undefined
): mimeType is SupplyImageMimeType {
  if (!mimeType) return false;
  return MIME_SET.has(mimeType.toLowerCase().split(";")[0]!.trim());
}

/**
 * Validates declared content type and size for a supply image upload.
 * Returns an error message, or null when valid.
 */
export function validateSupplyImageUpload(input: {
  contentType: string;
  contentLength: number;
}): string | null {
  if (!isAllowedSupplyImageMime(input.contentType)) {
    return "Only image uploads are allowed (WebP, JPEG, PNG, or GIF)";
  }
  if (
    !Number.isFinite(input.contentLength) ||
    !Number.isInteger(input.contentLength) ||
    input.contentLength <= 0
  ) {
    return "Image size must be a positive integer";
  }
  if (input.contentLength > MAX_SUPPLY_IMAGE_BYTES) {
    return `Image must be ${MAX_SUPPLY_IMAGE_BYTES / (1024 * 1024)} MB or smaller`;
  }
  return null;
}

/**
 * Builds a private object key for a supply image.
 * Layout: sites/{siteId}/supplies/{supplyId}/{uuid}.{ext}
 */
export function buildSupplyImageKey(input: {
  siteId: string;
  supplyId: string;
  contentType: string;
  objectId?: string;
}): string {
  const ext = extensionForMime(input.contentType);
  const id =
    input.objectId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  return `sites/${input.siteId}/supplies/${input.supplyId}/${id}.${ext}`;
}

export function extensionForMime(contentType: string): string {
  const mime = contentType.toLowerCase().split(";")[0]!.trim();
  switch (mime) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

/** True when the key belongs to this site + supply (path prefix check). */
export function isSupplyImageKeyFor(
  key: string,
  siteId: string,
  supplyId: string
): boolean {
  const prefix = `sites/${siteId}/supplies/${supplyId}/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  // Reject path traversal / nested segments.
  if (!rest || rest.includes("/") || rest.includes("..")) return false;
  return /^[A-Za-z0-9._-]+$/.test(rest);
}

/** Stable same-origin URL used in UI (never a signed R2 URL). */
export function supplyImageUrl(supplyId: string): string {
  return `/api/supplies/${encodeURIComponent(supplyId)}/image`;
}
