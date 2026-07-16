import {
  ATTACHMENT_ACCEPT,
  isAllowedAttachmentMimeType,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_UPLOAD,
  validateAttachmentBuffer,
  type AllowedAttachmentMimeType,
} from "@/lib/file-attachment";

export type ClientAttachmentPayload = {
  filename: string;
  mimeType: AllowedAttachmentMimeType;
  contentBase64: string;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function readFilesAsAttachments(
  fileList: FileList | File[]
): Promise<{ attachments: ClientAttachmentPayload[]; error?: string }> {
  const files = Array.from(fileList);
  if (files.length === 0) return { attachments: [] };
  if (files.length > MAX_ATTACHMENTS_PER_UPLOAD) {
    return {
      attachments: [],
      error: `You can upload at most ${MAX_ATTACHMENTS_PER_UPLOAD} files`,
    };
  }

  const attachments: ClientAttachmentPayload[] = [];
  for (const file of files) {
    const mimeType = file.type || "application/octet-stream";
    if (!isAllowedAttachmentMimeType(mimeType)) {
      return {
        attachments: [],
        error: `${file.name}: File type not allowed. Use JPEG, PNG, WebP, GIF, or PDF.`,
      };
    }
    const validationError = validateAttachmentBuffer({
      filename: file.name,
      mimeType,
      size: file.size,
    });
    if (validationError) {
      return { attachments: [], error: `${file.name}: ${validationError}` };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return {
        attachments: [],
        error: `${file.name} exceeds the 1 MB size limit`,
      };
    }
    const contentBase64 = await readFileAsBase64(file);
    attachments.push({
      filename: file.name,
      mimeType,
      contentBase64,
    });
  }

  return { attachments };
}

export { ATTACHMENT_ACCEPT };
