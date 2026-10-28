import { describe, expect, it } from "vitest";
import {
  buildSupplyImageKey,
  isAllowedSupplyImageMime,
  isSupplyImageKeyFor,
  MAX_SUPPLY_IMAGE_BYTES,
  validateSupplyImageUpload,
} from "@/lib/supply-image";

describe("validateSupplyImageUpload", () => {
  it("accepts allowed image types under the size cap", () => {
    expect(
      validateSupplyImageUpload({
        contentType: "image/webp",
        contentLength: 120_000,
      })
    ).toBeNull();
    expect(
      validateSupplyImageUpload({
        contentType: "image/jpeg",
        contentLength: MAX_SUPPLY_IMAGE_BYTES,
      })
    ).toBeNull();
  });

  it("rejects non-image types", () => {
    expect(
      validateSupplyImageUpload({
        contentType: "application/pdf",
        contentLength: 1000,
      })
    ).toMatch(/only image/i);
    expect(
      validateSupplyImageUpload({
        contentType: "text/plain",
        contentLength: 100,
      })
    ).toMatch(/only image/i);
  });

  it("rejects oversized and non-positive sizes", () => {
    expect(
      validateSupplyImageUpload({
        contentType: "image/png",
        contentLength: MAX_SUPPLY_IMAGE_BYTES + 1,
      })
    ).toMatch(/5 MB/i);
    expect(
      validateSupplyImageUpload({
        contentType: "image/png",
        contentLength: 0,
      })
    ).toMatch(/positive/i);
    expect(
      validateSupplyImageUpload({
        contentType: "image/png",
        contentLength: 12.5,
      })
    ).toMatch(/positive/i);
  });
});

describe("isAllowedSupplyImageMime", () => {
  it("normalizes charset parameters", () => {
    expect(isAllowedSupplyImageMime("image/webp; charset=binary")).toBe(true);
    expect(isAllowedSupplyImageMime("IMAGE/JPEG")).toBe(true);
    expect(isAllowedSupplyImageMime("image/svg+xml")).toBe(false);
  });
});

describe("buildSupplyImageKey", () => {
  it("builds a site/supply-scoped object key with the right extension", () => {
    const key = buildSupplyImageKey({
      siteId: "site-abc",
      supplyId: "sup-123",
      contentType: "image/webp",
      objectId: "obj-1",
    });
    expect(key).toBe("sites/site-abc/supplies/sup-123/obj-1.webp");
  });

  it("maps jpeg to .jpg", () => {
    const key = buildSupplyImageKey({
      siteId: "s1",
      supplyId: "p1",
      contentType: "image/jpeg",
      objectId: "x",
    });
    expect(key.endsWith(".jpg")).toBe(true);
  });
});

describe("isSupplyImageKeyFor", () => {
  it("accepts keys for the matching site and supply", () => {
    expect(
      isSupplyImageKeyFor(
        "sites/site-1/supplies/sup-1/abc.webp",
        "site-1",
        "sup-1"
      )
    ).toBe(true);
  });

  it("rejects foreign sites, path traversal, and nested segments", () => {
    expect(
      isSupplyImageKeyFor(
        "sites/other/supplies/sup-1/abc.webp",
        "site-1",
        "sup-1"
      )
    ).toBe(false);
    expect(
      isSupplyImageKeyFor(
        "sites/site-1/supplies/sup-1/../evil.webp",
        "site-1",
        "sup-1"
      )
    ).toBe(false);
    expect(
      isSupplyImageKeyFor(
        "sites/site-1/supplies/sup-1/nested/abc.webp",
        "site-1",
        "sup-1"
      )
    ).toBe(false);
  });
});
