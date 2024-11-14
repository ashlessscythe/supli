import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditLogTable } from "@/components/admin/audit-log-table";

async function getAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));
}

export default async function AdminAuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">
          View system activity and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogTable data={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
