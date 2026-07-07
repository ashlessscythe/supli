import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/server/email/email.service";
import { failure, success } from "@/lib/result";

export const notificationService = {
  async listForUser(userId: string, unreadOnly = false) {
    const notifications = await prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return success(notifications);
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

  async markRead(userId: string, id: string) {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return success({ success: true });
  },

  async notifyLowStock(
    adminUserId: string,
    adminEmail: string | null,
    itemName: string,
    quantity: number
  ) {
    await this.create(
      adminUserId,
      NotificationType.LOW_STOCK,
      "Low stock alert",
      `${itemName} has ${quantity} remaining`,
      { itemName, quantity }
    );

    if (adminEmail) {
      await emailService.sendReorderAlert(adminEmail, itemName, quantity);
    }
  },
};
