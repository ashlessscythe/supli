// Barcodes are stored in a canonical form (uppercase alphanumeric, no
// separators) so that lookups and the unique constraint are dash-insensitive:
// "SUP-PAPR-A4WH-7K21" and "suppapra4wh7k21" resolve to the same item.
// Dashes are purely a display concern (see `formatBarcode`).

export function normalizeBarcode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

// Human-readable barcode with dashes, for display only. Never persist this.
// The canonical value is grouped into blocks of four, e.g.
// "HDML4NDR8K23" -> "HDML-4NDR-8K23".
export function formatBarcode(value: string | null | undefined): string {
  const normalized = normalizeBarcode(value);
  if (!normalized) return "";

  const groups = normalized.match(/.{1,4}/g) ?? [normalized];
  return groups.join("-");
}

/** QR codes encode the canonical barcode; items without one cannot show a QR. */
export function canShowSupplyQr(barcode: string | null | undefined): boolean {
  return normalizeBarcode(barcode).length > 0;
}
