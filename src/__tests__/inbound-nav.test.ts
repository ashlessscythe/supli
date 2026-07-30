import { describe, expect, it } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  adminNavigationItems,
  staffNavigationItems,
} from "@/lib/nav-config";
import { hrefForNotification } from "@/lib/notification-href";

describe("inbound navigation surfaces", () => {
  it("uses Inbound in staff nav and drops separate Requests/Receipts entries", () => {
    const hrefs = staffNavigationItems.map((item) => item.href);
    const names = staffNavigationItems.map((item) => item.name);

    expect(hrefs).toContain("/dashboard/inbound");
    expect(names).toContain("Inbound");
    expect(hrefs).toContain("/dashboard/history");
    expect(names).toContain("History");
    expect(hrefs).not.toContain("/dashboard/requests");
    expect(hrefs).not.toContain("/dashboard/receipts");
    expect(names).not.toContain("Requests");
    expect(names).not.toContain("Receipts");
  });

  it("uses Inbound in admin nav and drops separate Requests/Receipts entries", () => {
    const hrefs = adminNavigationItems.map((route) => route.href);
    const titles = adminNavigationItems.map((route) => route.title);

    expect(hrefs).toContain("/admin/inbound");
    expect(titles).toContain("Inbound");
    expect(hrefs).toContain("/admin/history");
    expect(titles).toContain("History");
    expect(hrefs).not.toContain("/admin/requests");
    expect(hrefs).not.toContain("/admin/receipts");
    expect(titles).not.toContain("Requests");
    expect(titles).not.toContain("Receipts");
  });

  it("routes request-status notifications to the inbound page", () => {
    expect(
      hrefForNotification({
        type: NotificationType.REQUEST_STATUS,
        metadata: null,
      })
    ).toBe("/dashboard/inbound");
  });

  it("routes low-stock notifications to the supply search when itemName is present", () => {
    expect(
      hrefForNotification({
        type: NotificationType.LOW_STOCK,
        metadata: { itemName: "Nitrile Gloves", quantity: 2 },
      })
    ).toBe("/admin/supplies?q=Nitrile%20Gloves");
  });

  it("falls back to supplies list for low-stock without itemName", () => {
    expect(
      hrefForNotification({
        type: NotificationType.LOW_STOCK,
        metadata: { quantity: 2 },
      })
    ).toBe("/admin/supplies");
  });
});
