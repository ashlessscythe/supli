"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Quantity
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {data.quantity}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Threshold
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {data.threshold}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Bar
          dataKey="quantity"
          fill={theme === "dark" ? "#adfa1d" : "#0ea5e9"}
          radius={[4, 4, 4, 4]}
        />
        <ReferenceLine
          x={0}
          stroke={theme === "dark" ? "#ef4444" : "#dc2626"}
          strokeDasharray="3 3"
        />
        {data.map((item, index) => (
          <ReferenceLine
            key={index}
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
