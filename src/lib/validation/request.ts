import { z } from "zod";
import { RequestStatus } from "@prisma/client";

export const requestSchema = z.object({
  supplyId: z.string().min(1, "Supply ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export const requestStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([RequestStatus.APPROVED, RequestStatus.DENIED]),
});

export type RequestInput = z.infer<typeof requestSchema>;
