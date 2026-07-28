import { requireSuperAdmin } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";
import { listAssignableUsers, listSites } from "@/lib/actions/site";
import { SitesClient } from "./sites-client";

export default async function AdminSitesPage() {
  await requireSuperAdmin();
  const [sitesResult, usersResult] = await Promise.all([
    listSites(),
    listAssignableUsers(),
  ]);
  const sites = sitesResult.success ? sitesResult.data : [];
  const users = usersResult.success ? usersResult.data : [];
  const activeSiteId =
    (await cookies()).get(ACTIVE_SITE_COOKIE)?.value ?? null;

  return (
    <SitesClient
      initialSites={sites.map((site) => ({
        id: site.id,
        name: site.name,
        slug: site.slug,
        isActive: site.isActive,
        _count: site._count,
      }))}
      initialUsers={users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        siteId: user.siteId,
        siteName: user.site?.name ?? null,
      }))}
      activeSiteId={activeSiteId}
    />
  );
}
