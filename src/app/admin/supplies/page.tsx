import { prisma } from "@/lib/prisma";
import { locationService } from "@/server/services/location.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuppliesTable } from "@/components/supplies/supplies-table";
import { SupplyDialog } from "@/components/supplies/supply-dialog";

async function getSupplies() {
  const supplies = await prisma.supply.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return supplies;
}

export default async function AdminSuppliesPage({
  searchParams,
}: {
  searchParams: { q?: string; stock?: string };
}) {
  const [supplies, locationsResult] = await Promise.all([
    getSupplies(),
    locationService.list(),
  ]);

  const locations = locationsResult.success
    ? locationsResult.data.map((l) => ({ id: l.id, name: l.name }))
    : [];

  const initialStockFilter =
    searchParams.stock === "low" ||
    searchParams.stock === "ok" ||
    searchParams.stock === "all"
      ? searchParams.stock
      : "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Supply Management
          </h2>
          <p className="text-muted-foreground">
            View and manage all supplies in the system
          </p>
        </div>
        <SupplyDialog isAdmin />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Supplies</CardTitle>
        </CardHeader>
        <CardContent>
          <SuppliesTable
            data={supplies}
            isAdmin={true}
            locations={locations}
            initialSearch={searchParams.q ?? ""}
            initialStockFilter={initialStockFilter}
          />
        </CardContent>
      </Card>
    </div>
  );
}
