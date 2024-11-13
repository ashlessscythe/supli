"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface OverviewProps {
  data: {
    name: string;
    total: number;
    approved: number;
    denied: number;
    pending: number;
  }[];
}

export function Overview({ data }: OverviewProps) {
  const { theme } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip />
        <Bar
          dataKey="total"
          fill={theme === "dark" ? "#adfa1d" : "#0ea5e9"}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="approved"
          fill={theme === "dark" ? "#84cc16" : "#22c55e"}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="denied"
          fill={theme === "dark" ? "#ef4444" : "#dc2626"}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="pending"
          fill={theme === "dark" ? "#facc15" : "#eab308"}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
