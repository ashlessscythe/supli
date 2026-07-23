import { requireAdmin } from "@/lib/auth/session";
import { locationService } from "@/server/services/location.service";
import { LocationsClient } from "./locations-client";

export default async function AdminLocationsPage() {
  const ctx = await requireAdmin();
  const result = await locationService.listAll(ctx.siteId);
  const locations = result.success ? result.data : [];

  return (
    <LocationsClient
      initialLocations={locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        description: loc.description,
        isActive: loc.isActive,
        _count: { stockLevels: loc._count.stockLevels },
      }))}
    />
  );
}
