import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    RESEND_API_KEY: undefined,
    EMAIL_FROM: undefined,
    NEXTAUTH_SECRET: "test-secret",
    NEXTAUTH_URL: "http://localhost:3000",
  },
}));

describe("emailProvider without Resend (onsite)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("logs and resolves instead of throwing when email is not configured", async () => {
    const { emailProvider } = await import("@/server/email/resend.provider");
    await expect(
      emailProvider.send({
        to: "ops@example.com",
        subject: "Test",
        html: "<p>hi</p>",
      })
    ).resolves.toBeUndefined();
    expect(console.info).toHaveBeenCalledWith(
      "[email:unconfigured]",
      "ops@example.com",
      "Test",
      expect.stringContaining("RESEND_API_KEY")
    );
  });
});
