import { requireAdmin } from "@/lib/auth/session";
import { vendorService } from "@/server/services/vendor.service";
import { VendorsClient } from "./vendors-client";

export default async function AdminVendorsPage() {
  const ctx = await requireAdmin();
  const result = await vendorService.listAll(ctx.siteId);
  const vendors = result.success ? result.data : [];

  return (
    <VendorsClient
      initialVendors={vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        contact: vendor.contact,
        website: vendor.website,
        notes: vendor.notes,
        isActive: vendor.isActive,
        _count: { itemVendors: vendor._count.itemVendors },
      }))}
    />
  );
}
