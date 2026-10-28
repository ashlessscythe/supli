import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/kiosk/supplies/route";
import { isKioskAuthenticated, getKioskSite } from "@/lib/kiosk";
import { getKioskCatalog } from "@/server/services/kiosk-catalog.service";

vi.mock("@/lib/kiosk", () => ({
  isKioskAuthenticated: vi.fn(),
  getKioskSite: vi.fn(),
}));

vi.mock("@/server/services/kiosk-catalog.service", () => ({
  getKioskCatalog: vi.fn(),
}));

describe("GET /api/kiosk/supplies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without kiosk auth", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(false);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getKioskCatalog).not.toHaveBeenCalled();
  });

  it("returns 401 when the kiosk site cookie is missing", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getKioskCatalog).not.toHaveBeenCalled();
  });

  it("returns site-fenced catalog shape with hasImage flag only (no keys/URLs)", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(getKioskCatalog).mockResolvedValue({
      categories: [{ id: "cat-1", name: "PPE" }],
      supplies: [
        {
          id: "supply-1",
          name: "Gloves",
          barcode: "ABC",
          internalSku: "SKU1",
          onHand: 12,
          itemTypeId: "cat-1",
          usageScore: 4,
          hasImage: true,
        },
      ],
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getKioskCatalog).toHaveBeenCalledWith("site-1");
    expect(json).toEqual({
      categories: [{ id: "cat-1", name: "PPE" }],
      supplies: [
        {
          id: "supply-1",
          name: "Gloves",
          barcode: "ABC",
          internalSku: "SKU1",
          onHand: 12,
          itemTypeId: "cat-1",
          usageScore: 4,
          hasImage: true,
        },
      ],
    });
    expect(JSON.stringify(json)).not.toMatch(/description/i);
    expect(JSON.stringify(json)).not.toMatch(/imageKey|r2\.cloudflare|https?:\/\//i);
  });
});
