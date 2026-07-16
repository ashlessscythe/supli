import { z } from "zod";
import { VendorReorderStatus } from "@prisma/client";

export const inventoryHistoryKindSchema = z.enum([
  "all",
  "order",
  "receipt",
  "consumption",
]);

export const inventoryHistorySearchSchema = z.object({
  q: z.string().optional(),
  kind: inventoryHistoryKindSchema.default("all"),
  status: z.nativeEnum(VendorReorderStatus).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export type InventoryHistoryKind = z.infer<typeof inventoryHistoryKindSchema>;
export type InventoryHistorySearchInput = z.input<
  typeof inventoryHistorySearchSchema
>;

export type InventoryHistoryItem = {
  id: string;
  kind: "order" | "receipt" | "consumption";
  date: string;
  supplyId: string;
  supplyName: string;
  quantity: number;
  locationName: string | null;
  vendorName: string | null;
  externalPoNumber: string | null;
  status: string | null;
  notes: string | null;
  username: string | null;
};
