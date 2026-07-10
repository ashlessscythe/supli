"use client";

import { useTheme } from "next-themes";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface ReceiptsChartProps {
  data: {
    name: string;
    value: number;
    color: string;
    darkColor: string;
  }[];
}

export function ReceiptsChart({ data }: ReceiptsChartProps) {
  const { theme } = useTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No receipts in the last 30 days.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart margin={{ top: 0, right: 0, bottom: 8, left: 0 }}>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={75}
          paddingAngle={2}
          dataKey="value"
          label={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={theme === "dark" ? entry.darkColor : entry.color}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: "12px", lineHeight: "1.4" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
