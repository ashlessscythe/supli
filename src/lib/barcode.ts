// Barcodes are stored in a canonical form (uppercase alphanumeric, no
// separators) so that lookups and the unique constraint are dash-insensitive:
// "SUP-PAPR-A4WH-7K21" and "suppapra4wh7k21" resolve to the same item.
// Dashes are purely a display concern (see `formatBarcode`).

export function normalizeBarcode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

// Human-readable barcode with dashes, for display only. Never persist this.
// Our generated codes look like "SUP" + 12 chars -> "SUP-XXXX-XXXX-XXXX".
// Anything else is grouped into blocks of four.
export function formatBarcode(value: string | null | undefined): string {
  const normalized = normalizeBarcode(value);
  if (!normalized) return "";

  let prefix = "";
  let body = normalized;
  if (normalized.startsWith("SUP") && normalized.length > 3) {
    prefix = "SUP-";
    body = normalized.slice(3);
  }

  const groups = body.match(/.{1,4}/g) ?? [body];
  return prefix + groups.join("-");
}
