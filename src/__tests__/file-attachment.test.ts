import { describe, expect, it } from "vitest";
import {
  decodeBase64Attachment,
  MAX_ATTACHMENT_BYTES,
  validateAttachmentBuffer,
} from "@/lib/file-attachment";
import { fileService } from "@/server/services/file.service";

describe("validateAttachmentBuffer", () => {
  it("accepts allowed image and pdf types under the size limit", () => {
    expect(
      validateAttachmentBuffer({
        filename: "slip.jpg",
        mimeType: "image/jpeg",
        size: 12_000,
      })
    ).toBeNull();
    expect(
      validateAttachmentBuffer({
        filename: "po.pdf",
        mimeType: "application/pdf",
        size: 100_000,
      })
    ).toBeNull();
  });

  it("rejects disallowed types and oversized files", () => {
    expect(
      validateAttachmentBuffer({
        filename: "notes.txt",
        mimeType: "text/plain",
        size: 100,
      })
    ).toMatch(/not allowed/i);
    expect(
      validateAttachmentBuffer({
        filename: "huge.png",
        mimeType: "image/png",
        size: MAX_ATTACHMENT_BYTES + 1,
      })
    ).toMatch(/1 MB/i);
  });
});

describe("fileService.parseUploads", () => {
  it("decodes valid base64 attachments", () => {
    const content = Buffer.from("receipt-bytes").toString("base64");
    const result = fileService.parseUploads([
      {
        filename: "receipt.png",
        mimeType: "image/png",
        contentBase64: content,
      },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.data.toString()).toBe("receipt-bytes");
    }
  });

  it("rejects oversized decoded payloads", () => {
    const content = Buffer.alloc(MAX_ATTACHMENT_BYTES + 10, 1).toString(
      "base64"
    );
    const result = fileService.parseUploads([
      {
        filename: "big.png",
        mimeType: "image/png",
        contentBase64: content,
      },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/1 MB/i);
    }
  });
});

describe("decodeBase64Attachment", () => {
  it("returns a buffer for valid base64", () => {
    const buffer = decodeBase64Attachment(
      Buffer.from("abc").toString("base64")
    );
    expect(buffer?.toString()).toBe("abc");
  });
});
