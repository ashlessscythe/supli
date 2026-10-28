import {
  MAX_SUPPLY_IMAGE_BYTES,
  SUPPLY_IMAGE_LONG_EDGE_PX,
} from "@/lib/supply-image";

export type PreparedSupplyImage = {
  blob: Blob;
  contentType: "image/webp" | "image/jpeg";
  contentLength: number;
  previewUrl: string;
};

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Resize in the browser to ~1024px on the long edge and encode as WebP
 * (JPEG fallback). Enforces the 5 MB cap on the encoded result.
 */
export async function prepareSupplyImageForUpload(
  file: File
): Promise<PreparedSupplyImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const img = await loadImageElement(file);
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale =
    longEdge > SUPPLY_IMAGE_LONG_EDGE_PX
      ? SUPPLY_IMAGE_LONG_EDGE_PX / longEdge
      : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image");
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  let contentType: "image/webp" | "image/jpeg" = "image/webp";
  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
    contentType = "image/jpeg";
  }
  if (!blob) {
    throw new Error("Could not encode image");
  }
  if (blob.size > MAX_SUPPLY_IMAGE_BYTES) {
    throw new Error(
      `Image must be ${MAX_SUPPLY_IMAGE_BYTES / (1024 * 1024)} MB or smaller after resize`
    );
  }

  return {
    blob,
    contentType,
    contentLength: blob.size,
    previewUrl: URL.createObjectURL(blob),
  };
}
