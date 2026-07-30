import {
  NotificationType,
  Prisma,
  Role,
  StockMovementType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  emailService,
  type ReorderAlertLastOrder,
  type ReorderAlertLastReceipt,
} from "@/server/email/email.service";
import { success } from "@/lib/result";

type ReorderAlertContext = {
  lastOrder: ReorderAlertLastOrder | null;
  lastReceipt: ReorderAlertLastReceipt | null;
};

async function loadReorderAlertContext(
  supplyId: string,
  siteId: string
): Promise<ReorderAlertContext> {
  const [lastOrderRow, lastReceiptRow] = await Promise.all([
    prisma.vendorReorder.findFirst({
      where: { supplyId, supply: { siteId } },
      orderBy: { orderedAt: "desc" },
      select: {
        quantity: true,
        orderedAt: true,
        status: true,
        externalPoNumber: true,
        vendor: { select: { name: true } },
      },
    }),
    prisma.stockMovement.findFirst({
      where: {
        supplyId,
        type: StockMovementType.RECEIVE,
        supply: { siteId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        quantity: true,
        createdAt: true,
        vendorReorder: {
          select: {
            externalPoNumber: true,
            vendor: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    lastOrder: lastOrderRow
      ? {
          vendorName: lastOrderRow.vendor?.name ?? null,
          quantity: lastOrderRow.quantity,
          orderedAt: lastOrderRow.orderedAt,
          status: lastOrderRow.status,
          externalPoNumber: lastOrderRow.externalPoNumber,
        }
      : null,
    lastReceipt: lastReceiptRow
      ? {
          quantity: lastReceiptRow.quantity,
          createdAt: lastReceiptRow.createdAt,
          externalPoNumber:
            lastReceiptRow.vendorReorder?.externalPoNumber ?? null,
          vendorName: lastReceiptRow.vendorReorder?.vendor?.name ?? null,
        }
      : null,
  };
}

export const notificationService = {
  async listForUser(userId: string, unreadOnly = false) {
    const notifications = await prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return success(notifications);
  },

  async unreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    return count;
  },

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Prisma.InputJsonValue
  ) {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, metadata: metadata ?? undefined },
    });
    return notification;
  },

  async dismiss(userId: string, id: string) {
    await prisma.notification.deleteMany({
      where: { id, userId },
    });
    return success({ success: true });
  },

  async clearAll(userId: string) {
    await prisma.notification.deleteMany({
      where: { userId },
    });
    return success({ success: true });
  },

  async deleteRegistrationNotifications(pendingUserId: string) {
    await prisma.notification.deleteMany({
      where: {
        type: NotificationType.USER_REGISTRATION,
        metadata: {
          path: ["userId"],
          equals: pendingUserId,
        },
      },
    });
  },

  async notifyAdminsOfRegistration(
    siteId: string,
    user: {
      id: string;
      username: string;
      email: string | null;
    }
  ) {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN, siteId },
      select: { id: true, email: true },
    });

    const title = "New registration request";
    const message = `${user.username} requested access${
      user.email ? ` (${user.email})` : ""
    }`;
    const metadata = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    await Promise.all(
      admins.map(async (admin) => {
        await this.create(
          admin.id,
          NotificationType.USER_REGISTRATION,
          title,
          message,
          metadata
        );
        if (admin.email) {
          await emailService.sendAdminNotification(
            admin.email,
            "New registration pending",
            `${user.username} registered and is awaiting approval.`
          );
        }
      })
    );
  },

  async notifyRequestStatus(
    userId: string,
    supplyName: string,
    status: "APPROVED" | "DENIED",
    requestId: string
  ) {
    const label = status === "APPROVED" ? "approved" : "denied";
    await this.create(
      userId,
      NotificationType.REQUEST_STATUS,
      `Request ${label}`,
      `Your request for ${supplyName} was ${label}.`,
      { requestId, status, supplyName }
    );
  },

  async notifyLowStock(
    adminUserId: string,
    adminEmail: string | null,
    itemName: string,
    quantity: number,
    supplyId?: string,
    reorderContext?: ReorderAlertContext
  ) {
    await this.create(
      adminUserId,
      NotificationType.LOW_STOCK,
      "Low stock alert",
      `${itemName} has ${quantity} remaining`,
      { itemName, quantity, supplyId }
    );

    if (adminEmail) {
      await emailService.sendReorderAlert(adminEmail, {
        itemName,
        quantity,
        lastOrder: reorderContext?.lastOrder ?? null,
        lastReceipt: reorderContext?.lastReceipt ?? null,
      });
    }
  },

  async notifyAdminsLowStock(
    siteId: string,
    itemName: string,
    quantity: number,
    supplyId: string
  ) {
    const [admins, reorderContext] = await Promise.all([
      prisma.user.findMany({
        where: { role: Role.ADMIN, siteId },
        select: { id: true, email: true },
      }),
      loadReorderAlertContext(supplyId, siteId),
    ]);

    await Promise.all(
      admins.map((admin) =>
        this.notifyLowStock(
          admin.id,
          admin.email,
          itemName,
          quantity,
          supplyId,
          reorderContext
        )
      )
    );
  },
};
