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

  return (
    <div className="relative flex min-h-screen max-w-[100vw] flex-col overflow-x-clip">
      <Header />
      <div className="container grid min-w-0 flex-1 gap-6 py-4 md:grid-cols-[200px_1fr] md:gap-12">
        <aside className="hidden w-[200px] flex-col md:flex">
          {role === Role.SUPERADMIN && (
            <SiteSwitcher sites={switcherSites} activeSiteId={activeSiteId} />
          )}
          <AdminNav role={role} />
        </aside>
        <main
          id="main-content"
          className="flex min-w-0 w-full flex-1 flex-col"
        >
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
