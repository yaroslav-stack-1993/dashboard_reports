"use client"

type Props = {
  clients: string[]
  selected: string
  onChange: (v: string) => void
  dateFrom: string
  dateTo: string
  onDateChange: (from: string, to: string) => void
}

export default function ClientFilter({ clients, selected, onChange, dateFrom, dateTo, onDateChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Клиент</label>
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="">Все клиенты</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Период</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateChange(e.target.value, dateTo)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateChange(dateFrom, e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>
    </div>
  )
}
