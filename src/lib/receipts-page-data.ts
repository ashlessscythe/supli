import { prisma } from "@/lib/prisma";
import { locationService } from "@/server/services/location.service";
import { stockMovementService } from "@/server/services/stock-movement.service";

export async function getReceiptsPageData() {
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

  return {
    supplies: supplies.map((supply) => ({
      id: supply.id,
      name: supply.name,
      quantity: supply.quantity,
      itemVendors: supply.itemVendors.map((iv) => ({
        vendorId: iv.vendorId,
        vendor: iv.vendor,
        isPreferred: iv.isPreferred,
      })),
    })),
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    receipts,
    openVendorReorders,
  };
}
