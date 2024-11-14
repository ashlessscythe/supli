import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestsTable } from "@/components/requests/requests-table";

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
  const requests = await getRequests();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Request Management
        </h2>
        <p className="text-muted-foreground">
          View and manage all supply requests
        </p>
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
