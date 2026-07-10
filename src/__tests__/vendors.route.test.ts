import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/vendors/route";
import { vendorService } from "@/server/services/vendor.service";
import { getServerSession } from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/server/services/vendor.service", () => ({
  vendorService: {
    list: vi.fn(),
    update: vi.fn(),
  },
}));

const adminSession = {
  user: { id: "admin-1", role: "ADMIN" },
};

function createPutRequest(body: unknown) {
  return new Request("http://localhost/api/vendors", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/vendors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
  });

  it("returns updated vendor when marking inactive", async () => {
    vi.mocked(vendorService.update).mockResolvedValue({
      success: true,
      data: {
        id: "vendor-1",
        name: "Balam Industries",
        isActive: false,
      },
    } as never);

    const response = await PUT(
      createPutRequest({
        id: "vendor-1",
        name: "Balam Industries",
        isActive: false,
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isActive).toBe(false);
    expect(vendorService.update).toHaveBeenCalledWith("admin-1", {
      id: "vendor-1",
      name: "Balam Industries",
      isActive: false,
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await PUT(
      createPutRequest({
        id: "vendor-1",
        name: "Balam Industries",
        isActive: false,
      })
    );

    expect(response.status).toBe(401);
    expect(vendorService.update).not.toHaveBeenCalled();
  });
});

describe("GET /api/vendors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never);
  });

  it("returns only active vendors from the service", async () => {
    vi.mocked(vendorService.list).mockResolvedValue({
      success: true,
      data: [{ id: "vendor-1", name: "Active Vendor", isActive: true }],
    } as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].isActive).toBe(true);
    expect(vendorService.list).toHaveBeenCalled();
    expect(vendorService.update).not.toHaveBeenCalled();
  });
});
