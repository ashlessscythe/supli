export type AuditDirection = "in" | "out" | "other";

/**
 * Classifies freeform audit action strings into inventory direction.
 * "in" = stock/orders arriving; "out" = stock leaving via consume/checkout/approval.
 */
export function classifyAuditDirection(action: string): AuditDirection {
  const normalized = action.trim().toLowerCase();

  if (
    normalized.startsWith("received ") ||
    normalized.startsWith("logged external order ")
  ) {
    return "in";
  }

  if (
    normalized.startsWith("kiosk consumed ") ||
    normalized.startsWith("checked out ") ||
    normalized.startsWith("approved request ")
  ) {
    return "out";
  }

  return "other";
}

export function auditDirectionLabel(direction: AuditDirection): string {
  switch (direction) {
    case "in":
      return "In";
    case "out":
      return "Out";
    default:
      return "Other";
  }
}
