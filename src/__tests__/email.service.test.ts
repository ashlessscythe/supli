import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailService } from "@/server/email/email.service";
import { emailProvider } from "@/server/email/resend.provider";

vi.mock("@/server/email/resend.provider", () => ({
  emailProvider: {
    send: vi.fn(),
  },
}));

describe("emailService.sendReorderAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(emailProvider.send).mockResolvedValue(undefined);
  });

  it("links to the supply search query and omits history when missing", async () => {
    await emailService.sendReorderAlert("admin@example.com", {
      itemName: "Nitrile Gloves",
      quantity: 2,
      lastOrder: null,
      lastReceipt: null,
    });

    expect(emailProvider.send).toHaveBeenCalledTimes(1);
    const message = vi.mocked(emailProvider.send).mock.calls[0][0];
    expect(message.to).toBe("admin@example.com");
    expect(message.subject).toBe("Reorder alert: Nitrile Gloves");
    expect(message.html).toContain(
      "/admin/supplies?q=Nitrile%20Gloves"
    );
    expect(message.html).toContain("View supply");
    expect(message.html).toContain("2</strong> remaining");
    expect(message.html).not.toContain("Last order:");
    expect(message.html).not.toContain("Last received:");
    expect(message.html).not.toContain("/admin/vendors?q=");
  });

  it("includes last order, last receipt, and vendor link when available", async () => {
    await emailService.sendReorderAlert("admin@example.com", {
      itemName: "Gloves",
      quantity: 1,
      lastOrder: {
        vendorName: "Acme Supply",
        quantity: 50,
        orderedAt: new Date("2026-06-01T12:00:00.000Z"),
        status: "PARTIALLY_RECEIVED",
        externalPoNumber: "PO-100",
      },
      lastReceipt: {
        quantity: 20,
        createdAt: new Date("2026-06-15T12:00:00.000Z"),
        externalPoNumber: "PO-100",
        vendorName: "Acme Supply",
      },
    });

    const message = vi.mocked(emailProvider.send).mock.calls[0][0];
    expect(message.html).toContain("Last order:");
    expect(message.html).toContain("from Acme Supply");
    expect(message.html).toContain("Partially received");
    expect(message.html).toContain("PO PO-100");
    expect(message.html).toContain("Last received:");
    expect(message.html).toContain("/admin/vendors?q=Acme%20Supply");
    expect(message.html).toContain("View vendor: Acme Supply");
  });

  it("falls back to receipt vendor for the vendor link", async () => {
    await emailService.sendReorderAlert("admin@example.com", {
      itemName: "Tape",
      quantity: 3,
      lastOrder: {
        vendorName: null,
        quantity: 10,
        orderedAt: new Date("2026-05-01T00:00:00.000Z"),
        status: "ORDERED",
        externalPoNumber: null,
      },
      lastReceipt: {
        quantity: 5,
        createdAt: new Date("2026-05-10T00:00:00.000Z"),
        externalPoNumber: null,
        vendorName: "Beta Co",
      },
    });

    const message = vi.mocked(emailProvider.send).mock.calls[0][0];
    expect(message.html).toContain("/admin/vendors?q=Beta%20Co");
  });
});
