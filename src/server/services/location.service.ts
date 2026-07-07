import { z } from "zod";
import { failure, success } from "@/lib/result";
import { locationRepository } from "@/server/repositories/location.repository";
import { executeWithAudit } from "@/server/audit";

const locationSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
});

export const locationService = {
  async list() {
    try {
      return success(await locationRepository.findAll());
    } catch {
      return failure("Failed to fetch locations");
    }
  },

  async create(userId: string, input: z.infer<typeof locationSchema>) {
    try {
      const data = locationSchema.parse(input);
      const location = await executeWithAudit(
        userId,
        `Created location: ${data.name}`,
        (tx) => tx.location.create({ data })
      );
      return success(location);
    } catch (error) {
      if (error instanceof z.ZodError) return failure(error.errors);
      return failure("Failed to create location");
    }
  },
};
