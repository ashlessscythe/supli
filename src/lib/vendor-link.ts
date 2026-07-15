/**
 * Helpers shared by vendor↔supply link UI (inline editors + ItemVendorLinkForm).
 * Keep validation identical across Edit Supply and Vendors → items modals.
 */

/** Empty → undefined (omit). Non-positive / NaN → undefined. */
export function parseOptionalPositiveNumber(
  value: string | undefined
): number | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
}

/** Empty → undefined (omit). Negative / NaN → undefined. Zero is allowed for cost. */
export function parseOptionalNonNegativeNumber(
  value: string | undefined
): number | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

export type LeadTimeParseResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/**
 * Inline lead-days editor semantics:
 * - blank clears the field (null)
 * - otherwise requires a positive whole number of days
 */
export function parseLeadTimeDaysInput(input: string): LeadTimeParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return {
      ok: false,
      error: "Enter a whole number of days (1+), or leave blank to clear.",
    };
  }

  return { ok: true, value: parsed };
}

/** Payload shape sent by link/edit forms and inline lead-time saves. */
export function buildLeadTimePatch(supplyId: string, leadTimeDays: number | null) {
  return { supplyId, leadTimeDays };
}
