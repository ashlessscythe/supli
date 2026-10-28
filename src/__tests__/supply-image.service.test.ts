import { beforeEach, describe, expect, it, vi } from "vitest";
import { supplyImageService } from "@/server/services/supply-image.service";
import { prisma } from "@/lib/prisma";
import {
  createPresignedPutUrl,
  deleteR2Object,
  isR2Configured,
} from "@/server/storage/r2";
import { MAX_SUPPLY_IMAGE_BYTES } from "@/lib/supply-image";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supply: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/storage/r2", () => ({
  isR2Configured: vi.fn(),
  createPresignedPutUrl: vi.fn(),
  createPresignedGetUrl: vi.fn(),
  deleteR2Object: vi.fn(),
  PRESIGNED_PUT_EXPIRES_SECONDS: 300,
}));

describe("supplyImageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isR2Configured).mockReturnValue(true);
  });

  it("createUploadUrl rejects when storage is not configured", async () => {
    vi.mocked(isR2Configured).mockReturnValue(false);
    const result = await supplyImageService.createUploadUrl("site-1", "s1", {
      contentType: "image/webp",
      contentLength: 1000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not configured/i);
    }
  });

  it("createUploadUrl validates size and type before touching R2", async () => {
    const oversized = await supplyImageService.createUploadUrl("site-1", "s1", {
      contentType: "image/webp",
      contentLength: MAX_SUPPLY_IMAGE_BYTES + 1,
    });
    expect(oversized.success).toBe(false);
    expect(prisma.supply.findFirst).not.toHaveBeenCalled();

    const badType = await supplyImageService.createUploadUrl("site-1", "s1", {
      contentType: "application/pdf",
      contentLength: 1000,
    });
    expect(badType.success).toBe(false);
    expect(createPresignedPutUrl).not.toHaveBeenCalled();
  });

  it("createUploadUrl issues a constrained presigned PUT for a known supply", async () => {
    vi.mocked(prisma.supply.findFirst).mockResolvedValue({ id: "s1" } as never);
    vi.mocked(createPresignedPutUrl).mockResolvedValue("https://put.example");

    const result = await supplyImageService.createUploadUrl("site-1", "s1", {
      contentType: "image/webp",
      contentLength: 2048,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uploadUrl).toBe("https://put.example");
      expect(result.data.key).toMatch(
        /^sites\/site-1\/supplies\/s1\/.+\.webp$/
      );
      expect(createPresignedPutUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "image/webp",
          key: result.data.key,
        })
      );
      expect(result.data.headers).toEqual({ "Content-Type": "image/webp" });
    }
  });

  it("confirmUpload rejects keys outside the supply prefix", async () => {
    const result = await supplyImageService.confirmUpload("site-1", "s1", {
      key: "sites/other/supplies/s1/x.webp",
      contentType: "image/webp",
      contentLength: 1000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/invalid image key/i);
    }
    expect(prisma.supply.update).not.toHaveBeenCalled();
  });

  it("confirmUpload replaces metadata and best-effort deletes the old object", async () => {
    vi.mocked(prisma.supply.findFirst).mockResolvedValue({
      imageKey: "sites/site-1/supplies/s1/old.webp",
    } as never);
    vi.mocked(prisma.supply.update).mockResolvedValue({} as never);
    vi.mocked(deleteR2Object).mockResolvedValue(true);

    const key = "sites/site-1/supplies/s1/new.webp";
    const result = await supplyImageService.confirmUpload("site-1", "s1", {
      key,
      contentType: "image/webp",
      contentLength: 1500,
    });

    expect(result.success).toBe(true);
    expect(prisma.supply.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({
          imageKey: key,
          imageContentType: "image/webp",
          imageSize: 1500,
        }),
      })
    );
    expect(deleteR2Object).toHaveBeenCalledWith(
      "sites/site-1/supplies/s1/old.webp"
    );
  });
});
