import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, POST, GET } from "@/app/api/vendors/[id]/items/route";
import { vendorService } from "@/server/services/vendor.service";
import { requireAdmin } from "@/lib/auth/session";
import { buildLeadTimePatch } from "@/lib/vendor-link";

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/server/services/vendor.service", () => ({
  vendorService: {
    listItems: vi.fn(),
    linkItem: vi.fn(),
    updateItemLink: vi.fn(),
    unlinkItem: vi.fn(),
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

const params = Promise.resolve({ id: "vendor-1" });

function createJsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/vendors/vendor-1/items", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/vendors/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
  });

  it("returns linked items including leadTimeDays for the modal list", async () => {
    vi.mocked(vendorService.listItems).mockResolvedValue({
      success: true,
      data: [
        {
          supplyId: "supply-1",
          name: "Widget",
          quantity: 10,
          minimumThreshold: 2,
          vendorSku: "SKU-1",
          internalSku: null,
          isPreferred: true,
          leadTimeDays: 5,
          moq: 2,
          cost: 12.5,
        },
      ],
    } as never);

    const response = await GET(new Request("http://localhost"), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].leadTimeDays).toBe(5);
    expect(vendorService.listItems).toHaveBeenCalledWith(SITE_ID, "vendor-1");
  });

  it("returns 401 when not an admin", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(new Request("http://localhost"), { params });

    expect(response.status).toBe(401);
    expect(vendorService.listItems).not.toHaveBeenCalled();
  });
});

describe("POST /api/vendors/[id]/items (link form with lead time)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
  });

  it("forwards leadTimeDays from the link supply/vendor form", async () => {
    vi.mocked(vendorService.linkItem).mockResolvedValue({
      success: true,
      data: {
        supplyId: "supply-1",
        vendorSku: null,
        internalSku: null,
        isPreferred: false,
        leadTimeDays: 7,
        moq: null,
        cost: null,
      },
    } as never);

    const payload = {
      supplyId: "supply-1",
      isPreferred: false,
      leadTimeDays: 7,
    };
    const response = await POST(createJsonRequest("POST", payload), { params });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.leadTimeDays).toBe(7);
    expect(vendorService.linkItem).toHaveBeenCalledWith(
      "vendor-1",
      "admin-1",
      SITE_ID,
      payload
    );
  });
});

describe("PATCH /api/vendors/[id]/items (inline lead days + edit form)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(adminCtx as never);
  });

  it("updates leadTimeDays via the inline editor patch body", async () => {
    vi.mocked(vendorService.updateItemLink).mockResolvedValue({
      success: true,
      data: {
        supplyId: "supply-1",
        vendorSku: null,
        internalSku: null,
        isPreferred: false,
        leadTimeDays: 4,
        moq: null,
        cost: null,
      },
    } as never);

    const payload = buildLeadTimePatch("supply-1", 4);
    const response = await PATCH(createJsonRequest("PATCH", payload), {
      params,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.leadTimeDays).toBe(4);
    expect(vendorService.updateItemLink).toHaveBeenCalledWith(
      "vendor-1",
      "admin-1",
      SITE_ID,
      payload
    );
  });

  it("clears leadTimeDays when the inline editor sends null", async () => {
    vi.mocked(vendorService.updateItemLink).mockResolvedValue({
      success: true,
      data: {
        supplyId: "supply-1",
        vendorSku: null,
        internalSku: null,
        isPreferred: false,
        leadTimeDays: null,
        moq: null,
        cost: null,
      },
    } as never);

    const payload = buildLeadTimePatch("supply-1", null);
    const response = await PATCH(createJsonRequest("PATCH", payload), {
      params,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.leadTimeDays).toBeNull();
    expect(vendorService.updateItemLink).toHaveBeenCalledWith(
      "vendor-1",
      "admin-1",
      SITE_ID,
      payload
    );
  });

  it("returns 401 for unauthenticated inline saves", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const response = await PATCH(
      createJsonRequest("PATCH", buildLeadTimePatch("supply-1", 3)),
      { params }
    );

    expect(response.status).toBe(401);
    expect(vendorService.updateItemLink).not.toHaveBeenCalled();
  });

  it("returns 400 when the service rejects the update", async () => {
    vi.mocked(vendorService.updateItemLink).mockResolvedValue({
      success: false,
      error: "Item link not found",
    } as never);

    const response = await PATCH(
      createJsonRequest("PATCH", buildLeadTimePatch("missing", 3)),
      { params }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Item link not found");
  });
});
