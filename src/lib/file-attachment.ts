export const MAX_ATTACHMENT_BYTES = 1 * 1024 * 1024; // 1 MB
export const MAX_ATTACHMENTS_PER_UPLOAD = 5;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_MIME_TYPES.join(",");

export function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(
    mimeType
  );
}

export function validateAttachmentBuffer(input: {
  filename: string;
  mimeType: string;
  size: number;
}): string | null {
  if (!input.filename.trim()) return "Filename is required";
  if (!isAllowedAttachmentMimeType(input.mimeType)) {
    return "File type not allowed. Use JPEG, PNG, WebP, GIF, or PDF.";
  }
  if (input.size <= 0) return "File is empty";
  if (input.size > MAX_ATTACHMENT_BYTES) {
    return "File exceeds the 1 MB size limit";
  }
  return null;
}

export function decodeBase64Attachment(contentBase64: string): Buffer | null {
  try {
    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length === 0) return null;
    return buffer;
  } catch {
    return null;
  }
}
