import { prisma } from "@/lib/prisma";
import { getSupplies } from "@/lib/actions/supply";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestsTable } from "@/components/requests/requests-table";
import { CreateRequestDialog } from "@/components/requests/create-request-dialog";

async function getRequests() {
  const requests = await prisma.request.findMany({
    include: {
      user: true,
      supply: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
}

export default async function AdminRequestsPage() {
  const [requests, suppliesResult] = await Promise.all([
    getRequests(),
    getSupplies(),
  ]);

  const supplies = suppliesResult.success ? suppliesResult.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Request Management
          </h2>
          <p className="text-muted-foreground">
            View and manage all supply requests
          </p>
        </div>
        <CreateRequestDialog supplies={supplies} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestsTable data={requests} isAdmin={true} />
        </CardContent>
      </Card>
    </div>
  );
}
