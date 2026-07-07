import { locationService } from "@/server/services/location.service";
import { LocationsClient } from "./locations-client";

export default async function AdminLocationsPage() {
  const result = await locationService.list();
  const locations = result.success ? result.data : [];

  return (
    <LocationsClient
      initialLocations={locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        isActive: loc.isActive,
        _count: { stockLevels: loc._count.stockLevels },
      }))}
    />
  );
}
