import { cookies, headers } from "next/headers";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { SiteSwitcher } from "@/components/admin/site-switcher";
import { Header } from "@/components/layout/header";
import { SiteTimezoneProvider } from "@/components/providers/site-timezone-provider";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";
import { prisma } from "@/lib/prisma";
import { settingsService } from "@/server/services/settings.service";
import { DEFAULT_SITE_TIMEZONE } from "@/lib/timezone";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session || (role !== Role.ADMIN && role !== Role.SUPERADMIN)) {
    redirect("/dashboard");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const activeSiteId =
    (await cookies()).get(ACTIVE_SITE_COOKIE)?.value ?? null;

  if (
    role === Role.SUPERADMIN &&
    !activeSiteId &&
    !pathname.startsWith("/admin/sites")
  ) {
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

  const siteIdForTimezone =
    role === Role.SUPERADMIN ? activeSiteId : session.user.siteId;
  const timeZone = siteIdForTimezone
    ? await settingsService.getSiteTimezone(siteIdForTimezone)
    : DEFAULT_SITE_TIMEZONE;

  return (
    <SiteTimezoneProvider timeZone={timeZone}>
      <div className="relative flex min-h-[100dvh] max-w-[100vw] flex-col overflow-x-clip pb-standalone-nav">
        <Header />
        <div className="container grid min-w-0 flex-1 gap-6 py-4 md:grid-cols-[200px_1fr] md:gap-12">
          <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] w-[200px] flex-col self-start overflow-y-auto py-2 md:flex">
            {role === Role.SUPERADMIN && (
              <SiteSwitcher sites={switcherSites} activeSiteId={activeSiteId} />
            )}
            <AdminNav role={role} />
          </aside>
          <main
            id="main-content"
            className="flex min-w-0 w-full flex-1 flex-col"
          >
            <div className="sticky top-14 z-40 -mx-4 mb-4 space-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:-mx-6 sm:px-6 md:hidden">
              {role === Role.SUPERADMIN && (
                <SiteSwitcher
                  sites={switcherSites}
                  activeSiteId={activeSiteId}
                />
              )}
              <AdminMobileNav role={role} />
            </div>
            {children}
          </main>
        </div>
      </div>
    </SiteTimezoneProvider>
  );
}
