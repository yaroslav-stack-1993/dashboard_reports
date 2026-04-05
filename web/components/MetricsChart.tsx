"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"

type DayStat = {
  date: string
  clicks: number
  cost: number
  conversions: number
  impressions: number
}

type Props = {
  data: DayStat[]
  metric: "clicks" | "cost" | "conversions" | "impressions"
}

const METRIC_LABELS: Record<string, string> = {
  clicks: "Клики",
  cost: "Расход (₽)",
  conversions: "Конверсии",
  impressions: "Показы",
}

const METRIC_COLOR: Record<string, string> = {
  clicks: "#1858D4",
  cost: "#F59E0B",
  conversions: "#10B981",
  impressions: "#8B5CF6",
}

export default function MetricsChart({ data, metric }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "d MMM", { locale: ru }),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        <Line
          type="monotone"
          dataKey={metric}
          name={METRIC_LABELS[metric]}
          stroke={METRIC_COLOR[metric]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
