import { requireSuperAdmin } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";
import { listSites } from "@/lib/actions/site";
import { SitesClient } from "./sites-client";

export default async function AdminSitesPage() {
  await requireSuperAdmin();
  const result = await listSites();
  const sites = result.success ? result.data : [];
  const activeSiteId = cookies().get(ACTIVE_SITE_COOKIE)?.value ?? null;

  return (
    <SitesClient
      initialSites={sites.map((site) => ({
        id: site.id,
        name: site.name,
        slug: site.slug,
        isActive: site.isActive,
        _count: site._count,
      }))}
      activeSiteId={activeSiteId}
    />
  );
}
