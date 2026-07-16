import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { LowStockCard } from "@/components/dashboard/low-stock-card";
import { Users, Package } from "lucide-react";
import { forecastService } from "@/server/services/forecast.service";
import {
  getReceiptsChartData,
  getSupplyChartData,
  getStats,
  getLowStockItems,
} from "@/lib/actions/admin";

export default async function AdminPage() {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your system&apos;s performance and status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

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
          suppliesHref="/admin/supplies"
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
