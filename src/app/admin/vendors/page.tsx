import { vendorService } from "@/server/services/vendor.service";
import { VendorsClient } from "./vendors-client";

export default async function AdminVendorsPage() {
  const result = await vendorService.listAll();
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
