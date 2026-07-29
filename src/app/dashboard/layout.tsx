import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SiteTimezoneProvider } from "@/components/providers/site-timezone-provider";
import { settingsService } from "@/server/services/settings.service";
import { DEFAULT_SITE_TIMEZONE } from "@/lib/timezone";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const timeZone = session.user.siteId
    ? await settingsService.getSiteTimezone(session.user.siteId)
    : DEFAULT_SITE_TIMEZONE;

  return (
    <SiteTimezoneProvider timeZone={timeZone}>
      <div className="relative flex min-h-screen max-w-[100vw] flex-col overflow-x-clip">
        <Header />
        <main id="main-content" className="min-w-0 flex-1">
          <div className="container min-w-0">{children}</div>
        </main>
      </div>
    </SiteTimezoneProvider>
  );
}
