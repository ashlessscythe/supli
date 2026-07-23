import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { Header } from "@/components/layout/header";
import { ACTIVE_SITE_COOKIE } from "@/lib/sites";

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
  const activeSiteId = cookies().get(ACTIVE_SITE_COOKIE)?.value;

  if (
    role === Role.SUPERADMIN &&
    !activeSiteId &&
    !pathname.startsWith("/admin/sites")
  ) {
    redirect("/admin/sites");
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] py-4">
        <aside className="hidden w-[200px] flex-col md:flex">
          <AdminNav role={role} />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          <div className="mb-4 md:hidden">
            <AdminMobileNav role={role} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
