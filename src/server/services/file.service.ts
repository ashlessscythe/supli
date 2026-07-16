import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/result";
import type { TransactionClient } from "@/server/audit";
import {
  decodeBase64Attachment,
  MAX_ATTACHMENT_BYTES,
  validateAttachmentBuffer,
} from "@/lib/file-attachment";

export type AttachmentUploadInput = {
  filename: string;
  mimeType: string;
  contentBase64: string;
};

export type ParsedAttachment = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

export type AttachmentLink = {
  supplyId?: string | null;
  stockMovementId?: string | null;
  vendorReorderId?: string | null;
  category: string;
};

export const fileService = {
  parseUploads(files: AttachmentUploadInput[]) {
    const parsed: ParsedAttachment[] = [];
    for (const file of files) {
      const data = decodeBase64Attachment(file.contentBase64);
      if (!data) {
        return failure(`Could not read file ${file.filename}`);
      }
      if (data.length > MAX_ATTACHMENT_BYTES) {
        return failure(`${file.filename} exceeds the 1 MB size limit`);
      }
      const validationError = validateAttachmentBuffer({
        filename: file.filename,
        mimeType: file.mimeType,
        size: data.length,
      });
      if (validationError) {
        return failure(`${file.filename}: ${validationError}`);
      }
      parsed.push({
        filename: file.filename.trim(),
        mimeType: file.mimeType,
        data,
      });
    }
    return success(parsed);
  },

  async insertParsed(
    userId: string,
    files: ParsedAttachment[],
    link: AttachmentLink,
    client: TransactionClient | typeof prisma = prisma
  ) {
    const created = [];
    for (const file of files) {
      const attachment = await client.fileAttachment.create({
        data: {
          supplyId: link.supplyId ?? null,
          stockMovementId: link.stockMovementId ?? null,
          vendorReorderId: link.vendorReorderId ?? null,
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.data.length,
          data: file.data,
          storageKey: null,
          category: link.category,
          uploadedById: userId,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          category: true,
          createdAt: true,
        },
      });
      created.push(attachment);
    }
    return created;
  },

  async getById(id: string) {
    try {
      const attachment = await prisma.fileAttachment.findUnique({
        where: { id },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          data: true,
          storageKey: true,
          category: true,
          createdAt: true,
        },
      });
      if (!attachment) return failure("Attachment not found");
      if (!attachment.data) {
        return failure("Attachment has no stored content");
      }
      return success(attachment);
    } catch {
      return failure("Failed to load attachment");
    }
  },

  async listMetadataForMovements(stockMovementIds: string[]) {
    if (stockMovementIds.length === 0) return [];
    return prisma.fileAttachment.findMany({
      where: { stockMovementId: { in: stockMovementIds } },
      select: {
        id: true,
        stockMovementId: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async listMetadataForReorders(vendorReorderIds: string[]) {
    if (vendorReorderIds.length === 0) return [];
    return prisma.fileAttachment.findMany({
      where: { vendorReorderId: { in: vendorReorderIds } },
      select: {
        id: true,
        vendorReorderId: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
