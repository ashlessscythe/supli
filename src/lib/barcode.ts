// Barcodes are stored in a canonical form (uppercase alphanumeric, no
// separators) so that lookups and the unique constraint are dash-insensitive:
// "SUP-PAPR-A4WH-7K21" and "suppapra4wh7k21" resolve to the same item.
// Dashes are purely a display concern (see `formatBarcode`).

// Crockford-style alphabet (no ambiguous 0/O/1/I) for generated barcodes.
export const BARCODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GENERATED_BARCODE_LENGTH = 12;

export function normalizeBarcode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Canonical 12-character barcode, e.g. "7K2QXB4M9AZ3". */
export function generateBarcode(): string {
  const bytes = new Uint8Array(GENERATED_BARCODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += BARCODE_ALPHABET[byte % BARCODE_ALPHABET.length];
  }
  return out;
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
