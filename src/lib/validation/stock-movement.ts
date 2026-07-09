import { z } from "zod";

export const receiveStockSchema = z.object({
  supplyId: z.string().min(1, "Supply is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  vendorId: z.string().optional(),
  externalPoRef: z.string().optional(),
  vendorReorderId: z.string().optional(),
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
});

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type LogVendorReorderInput = z.infer<typeof logVendorReorderSchema>;
