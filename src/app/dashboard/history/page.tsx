import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireSiteContext } from "@/lib/auth/session";
import { HistorySearchClient } from "@/components/inventory/history-search-client";
import { inventoryHistoryService } from "@/server/services/inventory-history.service";

export default async function DashboardHistoryPage() {
  let ctx;
  try {
    ctx = await requireSiteContext();
  } catch {
    redirect("/login");
  }

  if (ctx.role === Role.ADMIN || ctx.role === Role.SUPERADMIN) {
    redirect("/admin/history");
  }

  const initial = await inventoryHistoryService.search(ctx.siteId, {
    kind: "all",
    limit: 50,
  });
  const initialResults = initial.success ? initial.data : [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">History</h2>
        <p className="text-muted-foreground">
          Look up past purchase orders, receipts, and consumptions
        </p>
      </div>

      <HistorySearchClient
        initialResults={initialResults}
        suppliesPath="/dashboard/supplies"
      />
    </div>
  );
}
