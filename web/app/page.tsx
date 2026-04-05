"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { format, subDays } from "date-fns"
import ClientFilter from "@/components/ClientFilter"
import StatsTable from "@/components/StatsTable"
import MetricsChart from "@/components/MetricsChart"

type ClientSummary = {
  client_login: string
  clicks: number
  impressions: number
  cost: number
  conversions: number
  ctr: number
  cost_per_conversion: number
}

type DayStat = {
  date: string
  clicks: number
  cost: number
  conversions: number
  impressions: number
}

const METRICS = [
  { key: "clicks", label: "Клики" },
  { key: "cost", label: "Расход" },
  { key: "conversions", label: "Конверсии" },
  { key: "impressions", label: "Показы" },
] as const

export default function Dashboard() {
  const [clients, setClients] = useState<string[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(subDays(new Date(), 1), "yyyy-MM-dd"))
  const [tableData, setTableData] = useState<ClientSummary[]>([])
  const [chartData, setChartData] = useState<DayStat[]>([])
  const [activeMetric, setActiveMetric] = useState<"clicks" | "cost" | "conversions" | "impressions">("clicks")
  const [loading, setLoading] = useState(true)

  // Загрузка списка клиентов
  useEffect(() => {
    supabase
      .from("ad_stats")
      .select("client_login")
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r) => r.client_login))].sort()
          setClients(unique)
        }
      })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("ad_stats")
      .select("client_login, date, clicks, impressions, cost, conversions, ctr, cost_per_conversion")
      .gte("date", dateFrom)
      .lte("date", dateTo)

    if (selectedClient) {
      query = query.eq("client_login", selectedClient)
    }

    const { data } = await query

    if (!data) { setLoading(false); return }

    // Сводка по клиентам
    const byClient: Record<string, ClientSummary> = {}
    const byDate: Record<string, DayStat> = {}

    for (const row of data) {
      // По клиентам
      if (!byClient[row.client_login]) {
        byClient[row.client_login] = {
          client_login: row.client_login,
          clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, cost_per_conversion: 0,
        }
      }
      const c = byClient[row.client_login]
      c.clicks += row.clicks
      c.impressions += row.impressions
      c.cost += row.cost
      c.conversions += row.conversions

      // По датам
      if (!byDate[row.date]) {
        byDate[row.date] = { date: row.date, clicks: 0, cost: 0, conversions: 0, impressions: 0 }
      }
      byDate[row.date].clicks += row.clicks
      byDate[row.date].cost += row.cost
      byDate[row.date].conversions += row.conversions
      byDate[row.date].impressions += row.impressions
    }

    // Считаем CTR и CPA по итогам
    Object.values(byClient).forEach((c) => {
      c.ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
      c.cost_per_conversion = c.conversions > 0 ? c.cost / c.conversions : 0
    })

    setTableData(Object.values(byClient).sort((a, b) => b.cost - a.cost))
    setChartData(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)))
    setLoading(false)
  }, [dateFrom, dateTo, selectedClient])

  useEffect(() => { loadData() }, [loadData])

  // Итоговые цифры для карточек
  const totals = tableData.reduce(
    (acc, r) => ({ clicks: acc.clicks + r.clicks, cost: acc.cost + r.cost, conversions: acc.conversions + r.conversions, impressions: acc.impressions + r.impressions }),
    { clicks: 0, cost: 0, conversions: 0, impressions: 0 }
  )

  const cards = [
    { label: "Показы", value: totals.impressions.toLocaleString("ru-RU"), metric: "impressions" as const },
    { label: "Клики", value: totals.clicks.toLocaleString("ru-RU"), metric: "clicks" as const },
    { label: "Расход, ₽", value: totals.cost.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), metric: "cost" as const },
    { label: "Конверсии", value: totals.conversions.toLocaleString("ru-RU"), metric: "conversions" as const },
  ]

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <ClientFilter
          clients={clients}
          selected={selectedClient}
          onChange={setSelectedClient}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
        />
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.metric}
            onClick={() => setActiveMetric(card.metric)}
            className={`bg-white rounded-xl border p-5 text-left transition-all ${
              activeMetric === card.metric
                ? "border-brand shadow-sm ring-2 ring-brand/20"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</div>
            <div className={`text-2xl font-semibold ${loading ? "text-gray-300" : "text-gray-900"}`}>
              {loading ? "—" : card.value}
            </div>
          </button>
        ))}
      </div>

      {/* График */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">
            Динамика по дням
          </h2>
          <div className="flex gap-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeMetric === m.key
                    ? "bg-brand text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">Загрузка...</div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">Нет данных</div>
        ) : (
          <MetricsChart data={chartData} metric={activeMetric} />
        )}
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Сводка по клиентам
          {tableData.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">{tableData.length} клиентов</span>
          )}
        </h2>
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Загрузка...</div>
        ) : (
          <StatsTable
            data={tableData}
            onClientClick={(login) => setSelectedClient(login === selectedClient ? "" : login)}
          />
        )}
      </div>
    </div>
  )
}
