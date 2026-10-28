import { prisma } from "@/lib/prisma";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  buildSupplyImageKey,
  isSupplyImageKeyFor,
  validateSupplyImageUpload,
} from "@/lib/supply-image";
import {
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteR2Object,
  isR2Configured,
  PRESIGNED_PUT_EXPIRES_SECONDS,
} from "@/server/storage/r2";

export type SupplyImagePresign = {
  uploadUrl: string;
  key: string;
  headers: {
    "Content-Type": string;
    "Content-Length": string;
  };
  expiresIn: number;
};

export type SupplyImageMeta = {
  hasImage: boolean;
  contentType: string | null;
  size: number | null;
  updatedAt: Date | null;
};

export const supplyImageService = {
  isConfigured(): boolean {
    return isR2Configured();
  },

  async getMeta(
    siteId: string,
    supplyId: string
  ): Promise<ActionResult<SupplyImageMeta>> {
    const supply = await prisma.supply.findFirst({
      where: { id: supplyId, siteId },
      select: {
        imageKey: true,
        imageContentType: true,
        imageSize: true,
        imageUpdatedAt: true,
      },
    });
    if (!supply) return failure("Supply not found");
    return success({
      hasImage: Boolean(supply.imageKey),
      contentType: supply.imageContentType,
      size: supply.imageSize,
      updatedAt: supply.imageUpdatedAt,
    });
  },

  async createUploadUrl(
    siteId: string,
    supplyId: string,
    input: { contentType: string; contentLength: number }
  ): Promise<ActionResult<SupplyImagePresign>> {
    if (!isR2Configured()) {
      return failure("Object storage is not configured");
    }

    const validationError = validateSupplyImageUpload(input);
    if (validationError) return failure(validationError);

    const supply = await prisma.supply.findFirst({
      where: { id: supplyId, siteId },
      select: { id: true },
    });
    if (!supply) return failure("Supply not found");

    const key = buildSupplyImageKey({
      siteId,
      supplyId,
      contentType: input.contentType,
    });

    try {
      const uploadUrl = await createPresignedPutUrl({
        key,
        contentType: input.contentType,
        contentLength: input.contentLength,
      });
      return success({
        uploadUrl,
        key,
        headers: {
          "Content-Type": input.contentType,
          "Content-Length": String(input.contentLength),
        },
        expiresIn: PRESIGNED_PUT_EXPIRES_SECONDS,
      });
    } catch {
      return failure("Failed to create upload URL");
    }
  },

  async confirmUpload(
    siteId: string,
    supplyId: string,
    input: { key: string; contentType: string; contentLength: number }
  ): Promise<ActionResult<SupplyImageMeta>> {
    if (!isR2Configured()) {
      return failure("Object storage is not configured");
    }

    const validationError = validateSupplyImageUpload({
      contentType: input.contentType,
      contentLength: input.contentLength,
    });
    if (validationError) return failure(validationError);

    if (!isSupplyImageKeyFor(input.key, siteId, supplyId)) {
      return failure("Invalid image key");
    }

    const supply = await prisma.supply.findFirst({
      where: { id: supplyId, siteId },
      select: { imageKey: true },
    });
    if (!supply) return failure("Supply not found");

    const previousKey = supply.imageKey;

    await prisma.supply.update({
      where: { id: supplyId },
      data: {
        imageKey: input.key,
        imageContentType: input.contentType,
        imageSize: input.contentLength,
        imageUpdatedAt: new Date(),
      },
    });

    if (previousKey && previousKey !== input.key) {
      await deleteR2Object(previousKey);
    }

    return success({
      hasImage: true,
      contentType: input.contentType,
      size: input.contentLength,
      updatedAt: new Date(),
    });
  },

  async remove(
    siteId: string,
    supplyId: string
  ): Promise<ActionResult<{ removed: boolean }>> {
    const supply = await prisma.supply.findFirst({
      where: { id: supplyId, siteId },
      select: { imageKey: true },
    });
    if (!supply) return failure("Supply not found");

    const previousKey = supply.imageKey;
    if (!previousKey) {
      return success({ removed: false });
    }

    await prisma.supply.update({
      where: { id: supplyId },
      data: {
        imageKey: null,
        imageContentType: null,
        imageSize: null,
        imageUpdatedAt: null,
      },
    });

    if (isR2Configured()) {
      await deleteR2Object(previousKey);
    }

    return success({ removed: true });
  },

  /**
   * Returns a short-lived signed GET URL for an existing image, or null
   * when the supply has no image / storage is unavailable.
   */
  async getSignedViewUrl(
    siteId: string,
    supplyId: string
  ): Promise<
    ActionResult<{
      url: string;
      contentType: string | null;
    } | null>
  > {
    const supply = await prisma.supply.findFirst({
      where: { id: supplyId, siteId },
      select: { imageKey: true, imageContentType: true },
    });
    if (!supply) return failure("Supply not found");
    if (!supply.imageKey) return success(null);
    if (!isR2Configured()) return success(null);

    try {
      const url = await createPresignedGetUrl({ key: supply.imageKey });
      return success({
        url,
        contentType: supply.imageContentType,
      });
    } catch {
      return failure("Failed to create image URL");
    }
  },

  /** Best-effort R2 cleanup when a supply row is deleted. */
  async deleteObjectForKey(key: string | null | undefined): Promise<void> {
    if (!key || !isR2Configured()) return;
    await deleteR2Object(key);
  },
};
