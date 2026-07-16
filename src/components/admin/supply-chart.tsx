"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface SupplyChartProps {
  data: {
    name: string;
    quantity: number;
    threshold: number;
    status: "Low" | "OK";
  }[];
}

export function SupplyChart({ data }: SupplyChartProps) {
  const { theme } = useTheme();
  const okFill = theme === "dark" ? "#adfa1d" : "#0ea5e9";
  const lowFill = theme === "dark" ? "#f87171" : "#dc2626";

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <XAxis type="number" />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const row = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Quantity
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {row.quantity}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Threshold
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {row.threshold}
                      </span>
                    </div>
                  </div>
                  {row.status === "Low" && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      At or below minimum threshold
                    </p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="quantity" radius={[4, 4, 4, 4]}>
          {data.map((item, index) => (
            <Cell
              key={`${item.name}-${index}`}
              fill={item.status === "Low" ? lowFill : okFill}
            />
          ))}
        </Bar>
        <ReferenceLine
          x={0}
          stroke={theme === "dark" ? "#ef4444" : "#dc2626"}
          strokeDasharray="3 3"
        />
        {data.map((item, index) => (
          <ReferenceLine
            key={`threshold-${index}`}
            x={item.threshold}
            stroke={theme === "dark" ? "#facc15" : "#eab308"}
            strokeDasharray="3 3"
            segment={[{ y: index - 0.3 }, { y: index + 0.3 }]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
