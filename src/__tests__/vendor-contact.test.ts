import { describe, expect, it } from "vitest";
import { isVendorEmail, normalizeWebsiteUrl } from "@/lib/vendor-contact";

describe("isVendorEmail", () => {
  it("accepts simple email addresses", () => {
    expect(isVendorEmail("procurement@vendor.com")).toBe(true);
    expect(isVendorEmail("user.name+tag@example.co.uk")).toBe(true);
  });

  it("trims whitespace before validating", () => {
    expect(isVendorEmail("  procurement@vendor.com  ")).toBe(true);
  });

  it("rejects null, undefined, and blank values", () => {
    expect(isVendorEmail(null)).toBe(false);
    expect(isVendorEmail(undefined)).toBe(false);
    expect(isVendorEmail("")).toBe(false);
    expect(isVendorEmail("   ")).toBe(false);
  });

  it("rejects non-email contact text", () => {
    expect(isVendorEmail("John Smith")).toBe(false);
    expect(isVendorEmail("555-1234")).toBe(false);
    expect(isVendorEmail("not-an-email")).toBe(false);
    expect(isVendorEmail("@missing-local.com")).toBe(false);
    expect(isVendorEmail("missing-domain@")).toBe(false);
  });
});

describe("normalizeWebsiteUrl", () => {
  it("leaves http and https URLs unchanged", () => {
    expect(normalizeWebsiteUrl("https://vendor.com")).toBe(
      "https://vendor.com"
    );
    expect(normalizeWebsiteUrl("http://vendor.com/path")).toBe(
      "http://vendor.com/path"
    );
  });

  it("prepends https when the scheme is missing", () => {
    expect(normalizeWebsiteUrl("vendor.com")).toBe("https://vendor.com");
    expect(normalizeWebsiteUrl("www.vendor.com/shop")).toBe(
      "https://www.vendor.com/shop"
    );
  });

  it("trims whitespace", () => {
    expect(normalizeWebsiteUrl("  vendor.com  ")).toBe("https://vendor.com");
    expect(normalizeWebsiteUrl("  HTTPS://Vendor.COM  ")).toBe(
      "HTTPS://Vendor.COM"
    );
  });
});
