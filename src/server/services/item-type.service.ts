import { failure, success } from "@/lib/result";
import { itemTypeRepository } from "@/server/repositories/item-type.repository";

export const itemTypeService = {
  async list(siteId: string) {
    try {
      return success(await itemTypeRepository.findAll(siteId));
    } catch {
      return failure("Failed to fetch item types");
    }
  },
};
