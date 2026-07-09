import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRequests } from "@/lib/actions/request";
import { getSupplies } from "@/lib/actions/supply";
import { shouldShowAllRequests } from "@/lib/actions/settings";
import { RequestsTable } from "@/components/requests/requests-table";
import { CreateRequestDialog } from "@/components/requests/create-request-dialog";

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

  const filteredRequests =
    session.user.role !== "ADMIN" && !showAllRequests
      ? requests.filter((request) => request.userId === session.user.id)
      : requests;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
        <CreateRequestDialog supplies={supplies} />
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
