import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/kiosk/lookup/route";
import { isKioskAuthenticated, getKioskSite } from "@/lib/kiosk";
import { supplyRepository } from "@/server/repositories/supply.repository";

vi.mock("@/lib/kiosk", () => ({
  isKioskAuthenticated: vi.fn(),
  getKioskSite: vi.fn(),
}));

vi.mock("@/server/repositories/supply.repository", () => ({
  supplyRepository: {
    findByBarcode: vi.fn(),
  },
}));

function createRequest(barcode?: string) {
  const url = new URL("http://localhost/api/kiosk/lookup");
  if (barcode !== undefined) {
    url.searchParams.set("barcode", barcode);
  }
  return new Request(url);
}

describe("GET /api/kiosk/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the kiosk session is missing or invalid", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(false);

    const response = await GET(createRequest("ABC"));

    expect(response.status).toBe(401);
    expect(supplyRepository.findByBarcode).not.toHaveBeenCalled();
  });

  it("returns the item name for a barcode in the kiosk site", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(supplyRepository.findByBarcode).mockResolvedValue({
      id: "supply-1",
      name: "Nitrile gloves",
      barcode: "SUPABC",
    });

    const response = await GET(createRequest("sup-abc"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(supplyRepository.findByBarcode).toHaveBeenCalledWith(
      "SUPABC",
      "site-1"
    );
    expect(json).toEqual({ name: "Nitrile gloves", barcode: "SUPABC" });
  });

  it("returns 404 when the barcode does not match a supply", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });
    vi.mocked(supplyRepository.findByBarcode).mockResolvedValue(null);

    const response = await GET(createRequest("UNKNOWN"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Item not found");
  });

  it("returns 404 when the barcode is missing", async () => {
    vi.mocked(isKioskAuthenticated).mockResolvedValue(true);
    vi.mocked(getKioskSite).mockResolvedValue({
      id: "site-1",
      name: "Main",
      slug: "main",
    });

    const response = await GET(createRequest());

    expect(response.status).toBe(404);
    expect(supplyRepository.findByBarcode).not.toHaveBeenCalled();
  });
});
