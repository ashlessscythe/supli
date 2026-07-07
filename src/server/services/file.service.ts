import { prisma } from "@/lib/prisma";
import { storageProvider } from "@/server/storage/storage.provider";
import { failure, success } from "@/lib/result";
import crypto from "crypto";

export const fileService = {
  async upload(
    userId: string,
    file: { name: string; type: string; data: Buffer },
    options: { supplyId?: string; category: string }
  ) {
    try {
      const key = `${options.category}/${crypto.randomUUID()}-${file.name}`;
      await storageProvider.upload(key, file.data, file.type);

      const attachment = await prisma.fileAttachment.create({
        data: {
          supplyId: options.supplyId,
          filename: file.name,
          mimeType: file.type,
          size: file.data.length,
          storageKey: key,
          category: options.category,
          uploadedById: userId,
        },
      });

      return success(attachment);
    } catch {
      return failure("Failed to upload file");
    }
  },
};
