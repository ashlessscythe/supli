"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRequest, updateRequestStatus } from "@/lib/actions/request";
import { type RequestInput } from "@/lib/validation/request";
import { RequestStatus } from "@prisma/client";

export function useRequests() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRequest = async (data: RequestInput) => {
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
