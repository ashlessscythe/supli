"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRequest, updateRequestStatus } from "@/lib/actions/request";
import { z } from "zod";
import { RequestStatus } from "@prisma/client";

const requestSchema = z.object({
  supplyId: z.string().min(1, "Supply ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export function useRequests() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRequest = async (data: RequestFormData) => {
    try {
      setIsLoading(true);
      const result = await createRequest(data);

      if (!result.success) {
        const errorMessage = Array.isArray(result.error)
          ? result.error.map((err) => err.message).join(", ")
          : result.error;
        toast.error(errorMessage);
        return false;
      }

      toast.success("Request created successfully");
      router.push("/dashboard/requests");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to create request");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    try {
      setIsLoading(true);
      const result = await updateRequestStatus(id, status);

      if (!result.success) {
        toast.error(result.error as string);
        return false;
      }

      toast.success(`Request ${status.toLowerCase()} successfully`);
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to update request status");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleCreateRequest,
    handleUpdateStatus,
  };
}
