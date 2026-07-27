import { requireAdminPage } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const ctx = await requireAdminPage();

  const settings = await prisma.systemSetting.findMany({
    where: { siteId: ctx.siteId },
    orderBy: {
      key: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage system-wide settings and configurations
        </p>
      </div>

      <div className="grid gap-4">
        <div className="p-6 border rounded-lg">
          <SettingsForm settings={settings} />
        </div>
      </div>
    </div>
  );
}
