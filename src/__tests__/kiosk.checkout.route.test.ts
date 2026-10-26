import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/kiosk/checkout/route";
import { stockMovementService } from "@/server/services/stock-movement.service";
import {
  isKioskAuthenticated,
  getKioskUserId,
  getKioskSite,
} from "@/lib/kiosk";

vi.mock("@/lib/kiosk", () => ({
  isKioskAuthenticated: vi.fn(),
  getKioskUserId: vi.fn(),
  getKioskSite: vi.fn(),
}));

vi.mock("@/server/services/stock-movement.service", () => ({
  stockMovementService: {
    consumeBulk: vi.fn(),
  },
}));

function createRequest(body: unknown) {
  return new Request("http://localhost/api/kiosk/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/kiosk/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(false);

    const response = await POST(
      createRequest({ items: [{ supplyId: "a", quantity: 1 }] })
    );

    expect(response.status).toBe(401);
    expect(stockMovementService.consumeBulk).not.toHaveBeenCalled();
  });

  it("returns 400 for empty items", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });

    const response = await POST(createRequest({ items: [] }));
    expect(response.status).toBe(400);
    expect(stockMovementService.consumeBulk).not.toHaveBeenCalled();
  });

  it("returns 400 for negative quantity", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });

    const response = await POST(
      createRequest({ items: [{ supplyId: "a", quantity: -1 }] })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when too many items", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });

    const items = Array.from({ length: 51 }, (_, i) => ({
      supplyId: `s${i}`,
      quantity: 1,
    }));
    const response = await POST(createRequest({ items }));
    expect(response.status).toBe(400);
  });

  it("calls consumeBulk with kiosk user, site, and audit prefix on 200", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(getKioskUserId).mockResolvedValue("kiosk-user");
    vi.mocked(stockMovementService.consumeBulk).mockResolvedValue({
      success: true,
      data: {
        items: [
          { id: "supply-a", name: "Gloves", quantity: 9, minimumThreshold: 1 },
        ],
      },
    } as never);

    const body = {
      items: [{ supplyId: "supply-a", quantity: 1 }],
      clientCheckoutId: "11111111-1111-4111-8111-111111111111",
    };
    const response = await POST(createRequest(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(stockMovementService.consumeBulk).toHaveBeenCalledWith(
      "kiosk-user",
      "site-1",
      { items: body.items, locationId: undefined, notes: undefined },
      { auditPrefix: "Kiosk consumed" }
    );
    expect(json.items).toEqual([
      { id: "supply-a", name: "Gloves", quantity: 1 },
    ]);
  });

  it("returns 404 with missing supply ids", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(getKioskUserId).mockResolvedValue("kiosk-user");
    vi.mocked(stockMovementService.consumeBulk).mockResolvedValue({
      success: false,
      error: "Supply not found",
      missing: ["gone"],
    });

    const response = await POST(
      createRequest({ items: [{ supplyId: "gone", quantity: 1 }] })
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.missing).toEqual(["gone"]);
  });

  it("returns 409 with insufficient[] shape", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(getKioskUserId).mockResolvedValue("kiosk-user");
    vi.mocked(stockMovementService.consumeBulk).mockResolvedValue({
      success: false,
      error: "Insufficient stock for Gloves at this location",
      insufficient: [
        { supplyId: "supply-a", name: "Gloves", available: 2 },
        { supplyId: "supply-b", name: "Masks", available: 0 },
      ],
    });

    const response = await POST(
      createRequest({
        items: [
          { supplyId: "supply-a", quantity: 5 },
          { supplyId: "supply-b", quantity: 1 },
        ],
      })
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.insufficient).toEqual([
      { supplyId: "supply-a", name: "Gloves", available: 2 },
      { supplyId: "supply-b", name: "Masks", available: 0 },
    ]);
  });
});
