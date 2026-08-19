export type KioskScanLookupAdvance = {
  proceed: boolean;
  itemName: string | null;
  error: string | null;
};

/**
 * Decide whether a scanned barcode can move to quantity entry.
 * Unknown items stay on the scan step. Offline / network failures still
 * proceed so a flaky connection cannot block the kiosk.
 */
export function resolveKioskScanLookup(input: {
  online: boolean;
  lookupFailedNetwork?: boolean;
  ok?: boolean;
  name?: string | null;
  error?: string | null;
}): KioskScanLookupAdvance {
  if (!input.online || input.lookupFailedNetwork) {
    return { proceed: true, itemName: null, error: null };
  }

  if (input.ok) {
    return { proceed: true, itemName: input.name ?? null, error: null };
  }

  return {
    proceed: false,
    itemName: null,
    error: input.error?.trim() ? input.error : "Item not found",
  };
}
