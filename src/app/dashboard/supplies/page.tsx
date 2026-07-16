import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupplies } from "@/lib/actions/supply";
import { locationService } from "@/server/services/location.service";
import { SuppliesTable } from "@/components/supplies/supplies-table";
import { SupplyDialog } from "@/components/supplies/supply-dialog";
import { CheckoutDialog } from "@/components/inventory/checkout-dialog";

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: { q?: string; stock?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [result, locationsResult] = await Promise.all([
    getSupplies(),
    locationService.list(),
  ]);
  const supplies = result.success ? result.data : [];
  const locations =
    locationsResult.success && "data" in locationsResult
      ? locationsResult.data.map((l) => ({ id: l.id, name: l.name }))
      : [];
  const defaultLocationId =
    locations.find((location) => location.name === "Watchpoint Delta")?.id ??
    locations[0]?.id;
  const initialSearch = searchParams.q ?? "";
  const initialStockFilter =
    searchParams.stock === "low" ||
    searchParams.stock === "ok" ||
    searchParams.stock === "all"
      ? searchParams.stock
      : "all";

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Supplies</h2>
        <div className="flex items-center gap-2">
          <CheckoutDialog
            supplies={supplies || []}
            locations={locations}
            defaultLocationId={defaultLocationId}
          />
          {session.user.role === "ADMIN" && <SupplyDialog isAdmin />}
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SuppliesTable
          data={supplies || []}
          isAdmin={session.user.role === "ADMIN"}
          initialSearch={initialSearch}
          initialStockFilter={initialStockFilter}
          locations={locations}
        />
      </Suspense>
    </div>
  );
}
