import { ReceiptsClient } from "@/app/admin/receipts/receipts-client";
import { getReceiptsPageData } from "@/lib/receipts-page-data";

export default async function DashboardReceiptsPage() {
  const { supplies, locations, receipts, openVendorReorders } =
    await getReceiptsPageData();

  return (
    <div className="space-y-6 py-4 md:py-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Receipts</h2>
        <p className="text-muted-foreground">
          Receive inventory, log external orders, and review receipt history
        </p>
      </div>

      <ReceiptsClient
        supplies={supplies}
        locations={locations}
        receipts={receipts}
        openVendorReorders={openVendorReorders}
        suppliesPath="/dashboard/supplies"
      />
    </div>
  );
}
