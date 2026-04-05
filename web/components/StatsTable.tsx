"use client"

type ClientSummary = {
  client_login: string
  clicks: number
  impressions: number
  cost: number
  conversions: number
  ctr: number
  cost_per_conversion: number
}

type Props = {
  data: ClientSummary[]
  onClientClick: (login: string) => void
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function StatsTable({ data, onClientClick }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Нет данных за выбранный период
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {["Клиент", "Показы", "Клики", "CTR", "Расход, ₽", "Конверсии", "CPA, ₽"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.client_login}
              className={`border-b border-gray-100 hover:bg-brand-light cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              onClick={() => onClientClick(row.client_login)}
            >
              <td className="py-3 px-4 font-medium text-brand">{row.client_login}</td>
              <td className="py-3 px-4 text-gray-700">{fmt(row.impressions)}</td>
              <td className="py-3 px-4 text-gray-700">{fmt(row.clicks)}</td>
              <td className="py-3 px-4 text-gray-700">{fmt(row.ctr, 2)}%</td>
              <td className="py-3 px-4 text-gray-700">{fmt(row.cost, 2)}</td>
              <td className="py-3 px-4 text-gray-700">{fmt(row.conversions)}</td>
              <td className="py-3 px-4 text-gray-700">
                {row.cost_per_conversion > 0 ? fmt(row.cost_per_conversion, 2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-white font-semibold">
            <td className="py-3 px-4 text-gray-700">Итого</td>
            <td className="py-3 px-4">{fmt(data.reduce((s, r) => s + r.impressions, 0))}</td>
            <td className="py-3 px-4">{fmt(data.reduce((s, r) => s + r.clicks, 0))}</td>
            <td className="py-3 px-4">—</td>
            <td className="py-3 px-4">{fmt(data.reduce((s, r) => s + r.cost, 0), 2)}</td>
            <td className="py-3 px-4">{fmt(data.reduce((s, r) => s + r.conversions, 0))}</td>
            <td className="py-3 px-4">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
