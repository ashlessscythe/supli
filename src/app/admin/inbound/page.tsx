import { requireAdminPage } from "@/lib/auth/session";
import { InboundClient } from "./inbound-client";
import { getInboundPageData } from "@/lib/inbound-page-data";
import type { Request } from "@/types";

export default async function AdminInboundPage() {
  await requireAdminPage();

  const { supplies, locations, receipts, openVendorReorders, requests } =
    await getInboundPageData({ includeRequests: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inbound</h2>
        <p className="text-muted-foreground">
          Receive stock, log corporate POs, and review open orders
        </p>
      </div>

      <InboundClient
        supplies={supplies}
        locations={locations}
        receipts={receipts}
        openVendorReorders={openVendorReorders}
        suppliesPath="/admin/supplies"
        isAdmin
        requests={requests as Request[]}
      />
    </div>
  );
}
