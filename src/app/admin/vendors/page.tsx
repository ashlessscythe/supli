import { vendorService } from "@/server/services/vendor.service";
import { VendorsClient } from "./vendors-client";

export default async function AdminVendorsPage() {
  const result = await vendorService.list();
  const vendors = result.success ? result.data : [];

  return (
    <VendorsClient
      initialVendors={vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        contact: vendor.contact,
        website: vendor.website,
        _count: { itemVendors: vendor._count.itemVendors },
      }))}
    />
  );
}
