import { failure, success } from "@/lib/result";
import { itemTypeRepository } from "@/server/repositories/item-type.repository";

export const itemTypeService = {
  async list() {
    try {
      return success(await itemTypeRepository.findAll());
    } catch {
      return failure("Failed to fetch item types");
    }
  },
};
