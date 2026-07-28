import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { InboundClient } from "@/app/admin/inbound/inbound-client";
import { getInboundPageData } from "@/lib/inbound-page-data";
import type { Request } from "@/types";

export default async function DashboardInboundPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const isAdmin =
    session.user.role === Role.ADMIN ||
    session.user.role === Role.SUPERADMIN;
  const { supplies, locations, receipts, openVendorReorders, requests } =
    await getInboundPageData({ includeRequests: isAdmin });

  return (
    <div className="space-y-6 py-4 md:py-6">
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
        suppliesPath="/dashboard/supplies"
        isAdmin={isAdmin}
        requests={requests as Request[]}
      />
    </div>
  );
}
