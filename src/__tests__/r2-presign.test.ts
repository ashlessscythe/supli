import { afterEach, describe, expect, it } from "vitest";
import {
  createPresignedPutUrl,
  resetR2ClientForTests,
} from "@/server/storage/r2";

describe("createPresignedPutUrl CORS-safe signing", () => {
  afterEach(() => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ENDPOINT;
    resetR2ClientForTests();
  });

  it("signs only content-type (no checksum or content-length headers)", async () => {
    process.env.R2_ACCOUNT_ID = "acct";
    process.env.R2_ACCESS_KEY_ID = "AKIAEXAMPLE";
    process.env.R2_SECRET_ACCESS_KEY = "secretsecretsecretsecret";
    process.env.R2_BUCKET = "supli-images";
    resetR2ClientForTests();

    const url = await createPresignedPutUrl({
      key: "sites/site-1/supplies/s1/obj.webp",
      contentType: "image/webp",
    });
    const parsed = new URL(url);
    const signed = parsed.searchParams.get("X-Amz-SignedHeaders") ?? "";
    expect(signed.split(";").sort()).toEqual(["content-type", "host"]);
    expect(parsed.searchParams.has("x-amz-checksum-crc32")).toBe(false);
    expect(parsed.searchParams.has("x-amz-sdk-checksum-algorithm")).toBe(
      false
    );
    expect(signed).not.toContain("content-length");
  });
});
