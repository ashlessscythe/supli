import { z } from "zod";

export const supplySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z
    .number()
    .min(0, "Minimum threshold must be 0 or greater"),
});

export const supplyQuantitySchema = z.object({
  quantity: z.number().min(0, "Quantity cannot be negative"),
});

export type SupplyInput = z.infer<typeof supplySchema>;
