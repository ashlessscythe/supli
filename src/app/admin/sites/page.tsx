import { requireSuperAdmin } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";
import { listAssignableUsers, listSites } from "@/lib/actions/site";
import { SitesClient } from "./sites-client";

export default async function AdminSitesPage() {
  // #region agent log
  fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'C',location:'admin/sites/page.tsx:entry',message:'sites page entered',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  await requireSuperAdmin();
  const [sitesResult, usersResult] = await Promise.all([
    listSites(),
    listAssignableUsers(),
  ]);
  const sites = sitesResult.success ? sitesResult.data : [];
  const users = usersResult.success ? usersResult.data : [];
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
