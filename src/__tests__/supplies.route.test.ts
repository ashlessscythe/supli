import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/supplies/route";
import { supplyService } from "@/server/services/supply.service";
import { requireAdmin } from "@/lib/auth/session";

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
  requireSiteContext: vi.fn(),
}));

vi.mock("@/server/services/supply.service", () => ({
  supplyService: {
    delete: vi.fn(),
  },
}));

const SITE_ID = "site-1";

const adminCtx = {
  userId: "admin-1",
  username: "admin",
  role: "ADMIN",
  siteId: SITE_ID,
  isSuperAdmin: false,
};

function createDeleteRequest(id: string) {
  return new Request(`http://localhost/api/supplies?id=${id}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/supplies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
  });

  it("returns 400 when pending requests block deletion", async () => {
    vi.mocked(supplyService.delete).mockResolvedValue({
      success: false,
      error: "Cannot delete supply with pending requests",
    });

    const response = await DELETE(createDeleteRequest("supply-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot delete supply with pending requests");
    expect(supplyService.delete).toHaveBeenCalledWith(
      "admin-1",
      SITE_ID,
      "supply-1"
    );
  });

  it("returns 400 when remaining quantity blocks deletion", async () => {
    vi.mocked(supplyService.delete).mockResolvedValue({
      success: false,
      error: "Cannot delete supply with remaining quantity",
    });

    const response = await DELETE(createDeleteRequest("supply-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot delete supply with remaining quantity");
  });

  it("returns success payload when deletion succeeds", async () => {
    vi.mocked(supplyService.delete).mockResolvedValue({
      success: true,
      data: { id: "supply-1" },
    } as never);

    const response = await DELETE(createDeleteRequest("supply-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: "supply-1" });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const response = await DELETE(createDeleteRequest("supply-1"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(supplyService.delete).not.toHaveBeenCalled();
  });
});
