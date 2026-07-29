import { requireAdminPage } from "@/lib/auth/session";
import { settingsService } from "@/server/services/settings.service";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const ctx = await requireAdminPage();
  const result = await settingsService.list(ctx.siteId);
  const settings = result.success ? result.data : [];

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
