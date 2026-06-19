"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { ChartDataPoint } from "@/types"

interface CampaignChartProps {
  data: ChartDataPoint[]
}

export function CampaignChart({ data }: CampaignChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280} minHeight={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="sent"
          stroke="var(--chart-1)"
          strokeWidth={2}
          name="Sent"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="opened"
          stroke="var(--chart-4)"
          strokeWidth={2}
          name="Opened"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
