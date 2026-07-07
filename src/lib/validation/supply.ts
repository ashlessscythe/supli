import { z } from "zod";
import { normalizeBarcode } from "@/lib/barcode";

// Normalizes optional unique text fields: empty/whitespace becomes null so we
// don't trip the DB unique constraint with empty strings.
const nullableUniqueString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

// Barcodes are stored canonically (uppercase, no dashes) so matching ignores
// separators. Empty becomes null to avoid tripping the unique constraint.
const nullableBarcode = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;
    const normalized = normalizeBarcode(value);
    return normalized.length > 0 ? normalized : null;
  });

// Full set of pertinent fields an admin may set on a supply.
export const supplyAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z
    .number()
    .min(0, "Minimum threshold must be 0 or greater"),
  barcode: nullableBarcode,
  internalSku: nullableUniqueString,
});

// Sane-default subset a staff member may change on an existing supply.
export const supplyStaffUpdateSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z
    .number()
    .min(0, "Minimum threshold must be 0 or greater"),
});

// Kept as the canonical create/update schema (admin-level).
export const supplySchema = supplyAdminSchema;

export const supplyQuantitySchema = z.object({
  quantity: z.number().min(0, "Quantity cannot be negative"),
});

export type SupplyInput = z.infer<typeof supplyAdminSchema>;
export type SupplyStaffUpdateInput = z.infer<typeof supplyStaffUpdateSchema>;
