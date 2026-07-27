import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { SiteSwitcher } from "@/components/admin/site-switcher";
import { Header } from "@/components/layout/header";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (
    !session ||
    (role !== Role.ADMIN && role !== Role.SUPERADMIN)
  ) {
    redirect("/dashboard");
  }

  const pathname = headers().get("x-pathname") ?? "";
  const activeSiteId = cookies().get(ACTIVE_SITE_COOKIE)?.value ?? null;
  const willRedirectToSites =
    role === Role.SUPERADMIN &&
    !activeSiteId &&
    !pathname.startsWith("/admin/sites");

  // #region agent log
  fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'A',location:'admin/layout.tsx:gate',message:'admin layout SUPERADMIN site gate',data:{role,pathname,pathnameEmpty:pathname==='',hasActiveSiteCookie:Boolean(activeSiteId),willRedirectToSites,rawHeader:headers().get("x-pathname")},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (willRedirectToSites) {
    // #region agent log
    fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'A',location:'admin/layout.tsx:redirect',message:'redirecting SUPERADMIN to /admin/sites',data:{pathname,hasActiveSiteCookie:false},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    redirect("/admin/sites");
  }

  const switcherSites =
    role === Role.SUPERADMIN
      ? await prisma.site.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        })
      : [];

  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] py-4">
        <aside className="hidden w-[200px] flex-col md:flex">
          {role === Role.SUPERADMIN && (
            <SiteSwitcher sites={switcherSites} activeSiteId={activeSiteId} />
          )}
          <AdminNav role={role} />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          <div className="mb-4 md:hidden">
            {role === Role.SUPERADMIN && (
              <SiteSwitcher sites={switcherSites} activeSiteId={activeSiteId} />
            )}
            <AdminMobileNav role={role} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
