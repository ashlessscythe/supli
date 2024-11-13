"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createSupply,
  updateSupply,
  deleteSupply,
  updateQuantity,
} from "@/lib/actions/supply";
import { z } from "zod";

const supplySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimumThreshold: z.number().min(0, "Minimum threshold must be 0 or greater"),
});

type SupplyFormData = z.infer<typeof supplySchema>;

export function useSupplies() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSupply = async (data: SupplyFormData) => {
    try {
      setIsLoading(true);
      const result = await createSupply(data);

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((err) => err.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return false;
      }

      toast.success("Supply created successfully");
      router.push("/dashboard/supplies");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to create supply");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSupply = async (id: string, data: SupplyFormData) => {
    try {
      setIsLoading(true);
      const result = await updateSupply(id, data);

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((err) => err.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return false;
      }

      toast.success("Supply updated successfully");
      router.push("/dashboard/supplies");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to update supply");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupply = async (id: string) => {
    try {
      setIsLoading(true);
      const result = await deleteSupply(id);

      if (!result.success) {
        toast.error(result.error as string);
        return false;
      }

      toast.success("Supply deleted successfully");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to delete supply");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    try {
      setIsLoading(true);
      const result = await updateQuantity(id, quantity);

      if (!result.success) {
        toast.error(result.error as string);
        return false;
      }

      toast.success("Quantity updated successfully");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to update quantity");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleCreateSupply,
    handleUpdateSupply,
    handleDeleteSupply,
    handleUpdateQuantity,
  };
}
