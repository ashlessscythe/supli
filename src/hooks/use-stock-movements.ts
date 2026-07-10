"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { receiveStock, adjustStock, checkoutSupplies } from "@/lib/actions/stock-movement";
import type {
  ReceiveStockInput,
  AdjustStockInput,
  BulkConsumeInput,
} from "@/lib/validation/stock-movement";

export function useStockMovements() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleReceive = async (data: ReceiveStockInput) => {
    try {
      setIsLoading(true);
      const result = await receiveStock(data);

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((err) => err.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return false;
      }

      toast.success("Stock received successfully");
      router.refresh();
      return true;
    } catch {
      toast.error("Failed to receive stock");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjust = async (data: AdjustStockInput) => {
    try {
      setIsLoading(true);
      const result = await adjustStock(data);

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((err) => err.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return false;
      }

      toast.success("Stock count adjusted");
      router.refresh();
      return true;
    } catch {
      toast.error("Failed to adjust stock");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (data: BulkConsumeInput) => {
    try {
      setIsLoading(true);
      const result = await checkoutSupplies(data);

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((err) => err.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return false;
      }

      const count = result.data.items.length;
      toast.success(
        count === 1
          ? `Checked out ${result.data.items[0].name}`
          : `Checked out ${count} items`
      );
      router.refresh();
      return true;
    } catch {
      toast.error("Failed to complete checkout");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleReceive,
    handleAdjust,
    handleCheckout,
  };
}
