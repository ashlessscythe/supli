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
});
