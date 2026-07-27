import { requireAdminPage } from "@/lib/auth/session";
import { HistorySearchClient } from "@/components/inventory/history-search-client";
import { inventoryHistoryService } from "@/server/services/inventory-history.service";

export default async function AdminHistoryPage() {
  const ctx = await requireAdminPage();
  const initial = await inventoryHistoryService.search(ctx.siteId, {
    kind: "all",
    limit: 50,
  });
  const initialResults = initial.success ? initial.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">History</h2>
        <p className="text-muted-foreground">
          Look up past purchase orders, receipts, and consumptions
        </p>
      </div>

      <HistorySearchClient
        initialResults={initialResults}
        suppliesPath="/admin/supplies"
      />
    </div>
  );
}
