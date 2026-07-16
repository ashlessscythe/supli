import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptsChart } from "@/components/admin/receipts-chart";
import { SupplyChart } from "@/components/admin/supply-chart";

interface DashboardChartsProps {
  receiptsData: {
    name: string;
    value: number;
    color: string;
    darkColor: string;
  }[];
  supplyData: {
    name: string;
    quantity: number;
    threshold: number;
    status: "Low" | "OK";
  }[];
  metrics: {
    recentMovements: number;
    fastMoving: { name: string; consumed: number }[];
  };
  depletion: {
    supplyId: string;
    name: string;
    daysUntilDepletion: number | null;
  }[];
}

export function DashboardCharts({
  receiptsData,
  supplyData,
  metrics,
  depletion,
}: DashboardChartsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Items received in the last 30 days
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <ReceiptsChart data={receiptsData} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Movements (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentMovements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fast Moving</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {metrics.fastMoving.map((item) => (
                <li key={item.name}>
                  {item.name}: {item.consumed}
                </li>
              ))}
              {metrics.fastMoving.length === 0 && (
                <li className="text-muted-foreground">No data yet</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Reorder Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {depletion.slice(0, 5).map((item) => (
                <li key={item.supplyId}>
                  {item.name}:{" "}
                  {item.daysUntilDepletion !== null
                    ? `~${item.daysUntilDepletion}d remaining`
                    : "No consumption data"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supply Levels</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lowest 10 supplies by current quantity. Red bars are at or below
            their minimum threshold; yellow ticks mark each item&apos;s
            threshold.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <SupplyChart data={supplyData} />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
