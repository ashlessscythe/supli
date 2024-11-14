import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRequests } from "@/lib/actions/request";
import { getSupplies } from "@/lib/actions/supply";
import { shouldShowAllRequests } from "@/lib/actions/settings";
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

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [requestsResult, suppliesResult, showAllRequests] = await Promise.all([
    getRequests(),
    getSupplies(),
    shouldShowAllRequests(),
  ]);

  if (!requestsResult.success || !suppliesResult.success) {
    // Handle error - for now, just show empty state
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
        </div>
        <p>Failed to load requests.</p>
      </div>
    );
  }

  const requests = requestsResult.data || [];
  const supplies = suppliesResult.data || [];

  // Filter requests if user is not admin and showAllRequests is false
  const filteredRequests =
    session.user.role !== "ADMIN" && !showAllRequests
      ? requests.filter((request) => request.userId === session.user.id)
      : requests;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
        <Dialog>
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
            <RequestForm supplies={supplies} />
          </DialogContent>
        </Dialog>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <RequestsTable
          data={filteredRequests}
          isAdmin={session.user.role === "ADMIN"}
        />
      </Suspense>
    </div>
  );
}
