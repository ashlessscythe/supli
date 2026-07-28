import { Suspense } from "react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireSiteContext } from "@/lib/auth/session";
import { getSupplies } from "@/lib/actions/supply";
import { locationService } from "@/server/services/location.service";
import { SuppliesTable } from "@/components/supplies/supplies-table";
import { SupplyDialog } from "@/components/supplies/supply-dialog";
import { CheckoutDialog } from "@/components/inventory/checkout-dialog";

export default async function SuppliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string }>;
}) {
  let ctx;
  try {
    ctx = await requireSiteContext();
  } catch {
    redirect("/login");
  }

  const sp = await searchParams;
  const [result, locationsResult] = await Promise.all([
    getSupplies(),
    locationService.list(ctx.siteId),
  ]);
  const supplies = result.success ? result.data : [];
  const locations =
    locationsResult.success && "data" in locationsResult
      ? locationsResult.data.map((l) => ({ id: l.id, name: l.name }))
      : [];
  const defaultLocationId =
    locations.find((location) => location.name === "Watchpoint Delta")?.id ??
    locations[0]?.id;
  const initialSearch = sp.q ?? "";
  const initialStockFilter =
    sp.stock === "low" || sp.stock === "ok" || sp.stock === "all"
      ? sp.stock
      : "all";

  const isAdmin =
    ctx.role === Role.ADMIN || ctx.role === Role.SUPERADMIN;

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
          {isAdmin && <SupplyDialog isAdmin />}
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SuppliesTable
          data={supplies || []}
          isAdmin={isAdmin}
          initialSearch={initialSearch}
          initialStockFilter={initialStockFilter}
          locations={locations}
        />
      </Suspense>
    </div>
  );
}
