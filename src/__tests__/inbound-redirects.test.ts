import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirect(path),
}));

describe("legacy inbound route redirects", () => {
  beforeEach(() => {
    redirect.mockClear();
    vi.resetModules();
  });

  async function expectRedirect(
    importPage: () => Promise<{ default: () => unknown }>,
    to: string
  ) {
    const mod = await importPage();
    expect(() => mod.default()).toThrow(`REDIRECT:${to}`);
    expect(redirect).toHaveBeenCalledWith(to);
  }

  it("redirects dashboard receipts to inbound", async () => {
    await expectRedirect(
      () => import("@/app/dashboard/receipts/page"),
      "/dashboard/inbound"
    );
  });

  it("redirects dashboard requests to inbound", async () => {
    await expectRedirect(
      () => import("@/app/dashboard/requests/page"),
      "/dashboard/inbound"
    );
  });

  it("redirects admin receipts to inbound", async () => {
    await expectRedirect(
      () => import("@/app/admin/receipts/page"),
      "/admin/inbound"
    );
  });

  it("redirects admin requests to inbound", async () => {
    await expectRedirect(
      () => import("@/app/admin/requests/page"),
      "/admin/inbound"
    );
  });
});
