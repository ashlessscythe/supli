import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationType, Role } from "@prisma/client";
import { notificationService } from "@/server/services/notification.service";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/server/email/email.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/email/email.service", () => ({
  emailService: {
    sendAdminNotification: vi.fn(),
    sendReorderAlert: vi.fn(),
  },
}));

describe("notificationService.dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes delete to the calling user id (blocks cross-user dismiss)", async () => {
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 0 } as never);

    const result = await notificationService.dismiss("user-a", "notif-1");

    expect(result.success).toBe(true);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: "notif-1", userId: "user-a" },
    });
  });
});

describe("notificationService.deleteRegistrationNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes registration notifications by metadata.userId", async () => {
    await notificationService.deleteRegistrationNotifications("pending-1");

    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: {
        type: NotificationType.USER_REGISTRATION,
        metadata: {
          path: ["userId"],
          equals: "pending-1",
        },
      },
    });
  });
});

describe("notificationService.notifyAdminsOfRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  it("creates an in-app notification per admin and emails only those with an address", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "admin-1", email: "a@example.com" },
      { id: "admin-2", email: null },
    ] as never);

    await notificationService.notifyAdminsOfRegistration({
      id: "pending-1",
      username: "newbie",
      email: "newbie@example.com",
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin-1",
          type: NotificationType.USER_REGISTRATION,
          metadata: expect.objectContaining({ userId: "pending-1" }),
        }),
      })
    );
    expect(emailService.sendAdminNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendAdminNotification).toHaveBeenCalledWith(
      "a@example.com",
      "New registration pending",
      expect.stringContaining("newbie")
    );
  });
});

describe("notificationService.notifyAdminsLowStock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  it("notifies all admins and skips reorder email when email is null", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "admin-1", email: null },
      { id: "admin-2", email: "b@example.com" },
    ] as never);

    await notificationService.notifyAdminsLowStock("Gloves", 2, "supply-1");

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.ADMIN },
      select: { id: true, email: true },
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(emailService.sendReorderAlert).toHaveBeenCalledTimes(1);
    expect(emailService.sendReorderAlert).toHaveBeenCalledWith(
      "b@example.com",
      "Gloves",
      2
    );
  });
});
