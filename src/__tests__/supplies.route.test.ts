import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/supplies/route";
import { supplyService } from "@/server/services/supply.service";
import { getServerSession } from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/server/services/supply.service", () => ({
  supplyService: {
    delete: vi.fn(),
  },
}));

const adminSession = {
  user: { id: "admin-1", role: "ADMIN" },
};

function createDeleteRequest(id: string) {
  return new Request(`http://localhost/api/supplies?id=${id}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/supplies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
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
    expect(supplyService.delete).toHaveBeenCalledWith("admin-1", "supply-1");
  });

  it("returns 400 when remaining quantity blocks deletion", async () => {
    vi.mocked(supplyService.delete).mockResolvedValue({
      success: false,
      error: "Cannot delete supply with remaining quantity",
    });

    const response = await DELETE(createDeleteRequest("supply-2"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot delete supply with remaining quantity");
  });

  it("returns 400 when open orders block deletion", async () => {
    vi.mocked(supplyService.delete).mockResolvedValue({
      success: false,
      error: "Cannot delete supply with open orders",
    });

    const response = await DELETE(createDeleteRequest("supply-3"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot delete supply with open orders");
  });

  it("returns deleted supply when deletion succeeds", async () => {
    vi.mocked(supplyService.delete).mockResolvedValue({
      success: true,
      data: { id: "supply-4", name: "Gloves" },
    } as never);

    const response = await DELETE(createDeleteRequest("supply-4"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("supply-4");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await DELETE(createDeleteRequest("supply-1"));

    expect(response.status).toBe(401);
    expect(supplyService.delete).not.toHaveBeenCalled();
  });
});
