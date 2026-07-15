import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/kiosk/consume/route";
import { stockMovementService } from "@/server/services/stock-movement.service";
import { isKioskAuthenticated, getKioskUserId } from "@/lib/kiosk";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/kiosk", () => ({
  isKioskAuthenticated: vi.fn(),
  getKioskUserId: vi.fn(),
}));

vi.mock("@/server/services/stock-movement.service", () => ({
  stockMovementService: {
    consume: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supply: {
      findUnique: vi.fn(),
    },
  },
}));

function createRequest(body: unknown) {
  return new Request("http://localhost/api/kiosk/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/kiosk/consume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the kiosk session is missing or invalid", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(false);

    const response = await POST(createRequest({ barcode: "ABC", quantity: 1 }));

    expect(response.status).toBe(401);
    expect(stockMovementService.consume).not.toHaveBeenCalled();
    expect(getKioskUserId).not.toHaveBeenCalled();
  });

  it("forwards consume to the kiosk system user when authenticated", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskUserId).mockResolvedValue("kiosk-user");
    vi.mocked(stockMovementService.consume).mockResolvedValue({
      success: true,
      data: { id: "supply-1", quantity: 9 },
    } as never);
    vi.mocked(prisma.supply.findUnique).mockResolvedValue({
      name: "Nitrile gloves",
    } as never);

    const body = { barcode: "SUPABC", quantity: 1 };
    const response = await POST(createRequest(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(stockMovementService.consume).toHaveBeenCalledWith("kiosk-user", body);
    expect(json).toEqual({
      id: "supply-1",
      quantity: 9,
      name: "Nitrile gloves",
    });
  });

  it("returns 400 when consume fails", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskUserId).mockResolvedValue("kiosk-user");
    vi.mocked(stockMovementService.consume).mockResolvedValue({
      success: false,
      error: "Insufficient stock",
    } as never);

    const response = await POST(createRequest({ barcode: "X", quantity: 99 }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Insufficient stock");
  });
});
