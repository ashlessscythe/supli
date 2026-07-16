import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { LowStockCard } from "@/components/dashboard/low-stock-card";
import { Package } from "lucide-react";
import { forecastService } from "@/server/services/forecast.service";
import {
  getReceiptsChartData,
  getSupplyChartData,
  getStats,
  getLowStockItems,
} from "@/lib/actions/admin";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const [stats, receiptsData, supplyData, metrics, depletion, lowStockItems] =
    await Promise.all([
      getStats(),
      getReceiptsChartData(),
      getSupplyChartData(),
      forecastService.getDashboardMetrics(),
      forecastService.getDepletionEstimates(),
      getLowStockItems(5),
    ]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of supplies and inventory activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Supplies
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSupplies}</div>
          </CardContent>
        </Card>
        <LowStockCard
          count={stats.lowStockItems}
          items={lowStockItems}
          suppliesHref="/dashboard/supplies"
        />
      </div>

      <DashboardCharts
        receiptsData={receiptsData}
        supplyData={supplyData}
        metrics={metrics}
        depletion={depletion}
      />
    </div>
  );
}
