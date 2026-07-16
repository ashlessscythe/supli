import { z } from "zod";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENTS_PER_UPLOAD,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/file-attachment";

export const attachmentInputSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES),
  contentBase64: z.string().min(1, "File content is required"),
});

export const attachmentsFieldSchema = z
  .array(attachmentInputSchema)
  .max(MAX_ATTACHMENTS_PER_UPLOAD, `At most ${MAX_ATTACHMENTS_PER_UPLOAD} files`)
  .optional();

export const receiveStockSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  vendorId: z.string().optional(),
  externalPoRef: z.string().optional(),
  vendorReorderId: z.string().optional(),
  attachments: attachmentsFieldSchema,
});

export const adjustStockSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  newQuantity: z.number().int().min(0, "Quantity must be 0 or greater"),
  locationId: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
});

export const logVendorReorderSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  vendorId: z.string().optional(),
  externalPoNumber: z.string().optional(),
  notes: z.string().optional(),
  attachments: attachmentsFieldSchema,
});

export const updateVendorReorderSchema = z.object({
  quantity: z.number().int().positive("Quantity must be at least 1"),
  vendorId: z.string().nullable().optional(),
  externalPoNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const bulkConsumeItemSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

export const bulkConsumeSchema = z.object({
  items: z.array(bulkConsumeItemSchema).min(1, "At least one item is required"),
  locationId: z.string().optional(),
  notes: z.string().optional(),
});

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type LogVendorReorderInput = z.infer<typeof logVendorReorderSchema>;
export type UpdateVendorReorderInput = z.infer<typeof updateVendorReorderSchema>;
export type BulkConsumeInput = z.infer<typeof bulkConsumeSchema>;
