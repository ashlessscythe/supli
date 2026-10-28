import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as presignPost } from "@/app/api/supplies/[id]/image/presign/route";
import { POST as confirmPost } from "@/app/api/supplies/[id]/image/confirm/route";
import { DELETE as imageDelete, GET as imageGet } from "@/app/api/supplies/[id]/image/route";
import { GET as storageStatus } from "@/app/api/storage/status/route";
import { requireAdmin, requireSiteContext } from "@/lib/auth/session";
import { getKioskSite, isKioskAuthenticated } from "@/lib/kiosk";
import { supplyImageService } from "@/server/services/supply-image.service";
import { isR2Configured } from "@/server/storage/r2";

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
  requireSiteContext: vi.fn(),
}));

vi.mock("@/lib/kiosk", () => ({
  isKioskAuthenticated: vi.fn(),
  getKioskSite: vi.fn(),
}));

vi.mock("@/server/services/supply-image.service", () => ({
  supplyImageService: {
    createUploadUrl: vi.fn(),
    confirmUpload: vi.fn(),
    remove: vi.fn(),
    getSignedViewUrl: vi.fn(),
  },
}));

vi.mock("@/server/storage/r2", () => ({
  isR2Configured: vi.fn(),
}));

const adminCtx = {
  userId: "admin-1",
  username: "admin",
  role: "ADMIN",
  siteId: "site-1",
  isSuperAdmin: false,
};

function params(id: string) {
  return Promise.resolve({ id });
}

describe("supply image admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated presign requests", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const response = await presignPost(
      new Request("http://localhost/api/supplies/s1/image/presign", {
        method: "POST",
        body: JSON.stringify({
          contentType: "image/webp",
          contentLength: 1000,
        }),
      }),
      { params: params("s1") }
    );

    expect(response.status).toBe(401);
    expect(supplyImageService.createUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated confirm and delete", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const confirm = await confirmPost(
      new Request("http://localhost/api/supplies/s1/image/confirm", {
        method: "POST",
        body: JSON.stringify({
          key: "sites/site-1/supplies/s1/a.webp",
          contentType: "image/webp",
          contentLength: 1000,
        }),
      }),
      { params: params("s1") }
    );
    const del = await imageDelete(
      new Request("http://localhost/api/supplies/s1/image", {
        method: "DELETE",
      }),
      { params: params("s1") }
    );

    expect(confirm.status).toBe(401);
    expect(del.status).toBe(401);
    expect(supplyImageService.confirmUpload).not.toHaveBeenCalled();
    expect(supplyImageService.remove).not.toHaveBeenCalled();
  });

  it("presigns after admin check and forwards size/type", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
    vi.mocked(supplyImageService.createUploadUrl).mockResolvedValue({
      success: true,
      data: {
        uploadUrl: "https://r2.example/put",
        key: "sites/site-1/supplies/s1/a.webp",
        headers: {
          "Content-Type": "image/webp",
        },
        expiresIn: 300,
      },
    });

    const response = await presignPost(
      new Request("http://localhost/api/supplies/s1/image/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "image/webp",
          contentLength: 1000,
        }),
      }),
      { params: params("s1") }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(supplyImageService.createUploadUrl).toHaveBeenCalledWith(
      "site-1",
      "s1",
      { contentType: "image/webp", contentLength: 1000 }
    );
    expect(body.uploadUrl).toBe("https://r2.example/put");
  });

  it("returns 400 when service rejects size/type on presign", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
    vi.mocked(supplyImageService.createUploadUrl).mockResolvedValue({
      success: false,
      error: "Image must be 5 MB or smaller",
    });

    const response = await presignPost(
      new Request("http://localhost/api/supplies/s1/image/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "image/png",
          contentLength: 9_000_000,
        }),
      }),
      { params: params("s1") }
    );

    expect(response.status).toBe(400);
  });

  it("storage status requires admin and reports configuration", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));
    expect((await storageStatus()).status).toBe(401);

    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
    vi.mocked(isR2Configured).mockReturnValue(false);
    const off = await storageStatus();
    expect(off.status).toBe(200);
    expect(await off.json()).toEqual({ configured: false });

    vi.mocked(isR2Configured).mockReturnValue(true);
    const on = await storageStatus();
    expect(await on.json()).toEqual({ configured: true });
  });
});

describe("GET /api/supplies/:id/image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous viewers", async () => {
    vi.mocked(requireSiteContext).mockRejectedValue(new Error("Unauthorized"));
    vi.mocked(isKioskAuthenticated).mockResolvedValue(false);

    const response = await imageGet(
      new Request("http://localhost/api/supplies/s1/image"),
      { params: params("s1") }
    );
    expect(response.status).toBe(401);
  });

  it("proxies bytes from a signed URL for site session users", async () => {
    vi.mocked(requireSiteContext).mockResolvedValue(adminCtx as never);
    vi.mocked(supplyImageService.getSignedViewUrl).mockResolvedValue({
      success: true,
      data: {
        url: "https://signed.example/obj",
        contentType: "image/webp",
      },
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/webp", "Content-Length": "3" },
        })
      );

    const response = await imageGet(
      new Request("http://localhost/api/supplies/s1/image"),
      { params: params("s1") }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(fetchMock).toHaveBeenCalledWith("https://signed.example/obj");
    fetchMock.mockRestore();
  });

  it("allows kiosk sessions for the same site", async () => {
    vi.mocked(requireSiteContext).mockRejectedValue(new Error("Unauthorized"));
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(supplyImageService.getSignedViewUrl).mockResolvedValue({
      success: true,
      data: { url: "https://signed.example/kiosk", contentType: "image/webp" },
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(new Uint8Array([9]), {
          status: 200,
          headers: { "Content-Type": "image/webp" },
        })
      );

    const response = await imageGet(
      new Request("http://localhost/api/supplies/s1/image"),
      { params: params("s1") }
    );

    expect(response.status).toBe(200);
    expect(supplyImageService.getSignedViewUrl).toHaveBeenCalledWith(
      "site-1",
      "s1"
    );
    fetchMock.mockRestore();
  });
});
