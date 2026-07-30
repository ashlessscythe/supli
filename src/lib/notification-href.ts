import { NotificationType } from "@prisma/client";

export type NotificationHrefInput = {
  type: NotificationType;
  metadata: unknown;
};

export function hrefForNotification(n: NotificationHrefInput): string {
  const meta =
    n.metadata && typeof n.metadata === "object"
      ? (n.metadata as Record<string, unknown>)
      : {};

  if (
    n.type === NotificationType.USER_REGISTRATION &&
    typeof meta.userId === "string"
  ) {
    return `/admin/users?pending=${meta.userId}`;
  }
  if (
    n.type === NotificationType.LOW_STOCK ||
    n.type === NotificationType.REORDER
  ) {
    if (typeof meta.itemName === "string" && meta.itemName.length > 0) {
      return `/admin/supplies?q=${encodeURIComponent(meta.itemName)}`;
    }
    return "/admin/supplies";
  }
  if (n.type === NotificationType.REQUEST_STATUS) {
    return "/dashboard/inbound";
  }
  return "/dashboard";
}
