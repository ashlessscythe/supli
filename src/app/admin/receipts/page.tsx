import { prisma } from "@/lib/prisma";
import { locationService } from "@/server/services/location.service";
import { stockMovementService } from "@/server/services/stock-movement.service";
import { ReceiptsClient } from "./receipts-client";

export default async function AdminReceiptsPage() {
  const [supplies, locationsResult, receiptsResult, reordersResult] =
    await Promise.all([
      prisma.supply.findMany({
        orderBy: { name: "asc" },
        include: {
          itemVendors: {
            include: { vendor: { select: { id: true, name: true } } },
          },
        },
      }),
      locationService.list(),
      stockMovementService.listReceipts(),
      stockMovementService.listOpenVendorReorders(),
    ]);

  const locations = locationsResult.success ? locationsResult.data : [];
  const receipts = receiptsResult.success ? receiptsResult.data : [];
  const openVendorReorders = reordersResult.success ? reordersResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Receipts</h2>
        <p className="text-muted-foreground">
          Receive inventory, log external orders, and review receipt history
        </p>
      </div>

      <ReceiptsClient
        supplies={supplies}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        receipts={receipts}
        openVendorReorders={openVendorReorders}
      />
    </div>
  );
}
