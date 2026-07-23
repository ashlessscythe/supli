import { requireSiteContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRequests } from "@/lib/actions/request";
import { locationService } from "@/server/services/location.service";
import { stockMovementService } from "@/server/services/stock-movement.service";

export async function getInboundPageData(options?: {
  includeRequests?: boolean;
}) {
  const ctx = await requireSiteContext();
  const includeRequests = options?.includeRequests ?? false;

  const [
    supplies,
    locationsResult,
    receiptsResult,
    reordersResult,
    requestsResult,
  ] = await Promise.all([
    prisma.supply.findMany({
      where: { siteId: ctx.siteId },
      orderBy: { name: "asc" },
      include: {
        itemVendors: {
          include: { vendor: { select: { id: true, name: true } } },
        },
      },
    }),
    locationService.list(ctx.siteId),
    stockMovementService.listReceipts(ctx.siteId),
    stockMovementService.listOpenVendorReorders(ctx.siteId),
    includeRequests ? getRequests() : Promise.resolve(null),
  ]);

  const locations = locationsResult.success ? locationsResult.data : [];
  const receipts = receiptsResult.success ? receiptsResult.data : [];
  const openVendorReorders = reordersResult.success ? reordersResult.data : [];
  const requests =
    includeRequests && requestsResult?.success ? requestsResult.data ?? [] : [];

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
    requests,
  };
}
