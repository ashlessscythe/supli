"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { getRequests } from "@/lib/actions/request";
import { getSupplies } from "@/lib/actions/supply";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestForm } from "@/components/requests/request-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Supply, Request } from "@/types";

export default function RequestsPage() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [requestsResult, suppliesResult] = await Promise.all([
      getRequests(),
      getSupplies(),
    ]);
    setIsLoading(false);

    if (requestsResult.success && suppliesResult.success) {
      setRequests(requestsResult.data || []);
      setSupplies(suppliesResult.data || []);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const handleSuccess = () => {
    setIsOpen(false);
    loadData();
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Request</DialogTitle>
            </DialogHeader>
            <RequestForm supplies={supplies} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <RequestsTable
          data={requests}
          isAdmin={session.user.role === "ADMIN"}
        />
      </Suspense>
    </div>
  );
}
