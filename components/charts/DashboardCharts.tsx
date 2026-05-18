'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
  Tooltip,
} from 'recharts'
import { formatGBP } from '@/lib/utils'

interface CategoryRevenue {
  category: string
  total: number
}

interface TrendEntry {
  month: string
  new_clients: number
  new_leads: number
}

interface Props {
  categoryRevenue: CategoryRevenue[]
  trend: TrendEntry[]
}

export default function DashboardCharts({ categoryRevenue, trend }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 mt-6">
      <div className="border border-[#e5e7eb] bg-white p-4">
        <h2 className="font-semibold text-sm mb-4" style={{ color: '#1A2C4E' }}>
          Revenue This Month by Category
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={categoryRevenue} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => formatGBP(v)} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [formatGBP(Number(v)), 'Revenue']} />
            <Bar dataKey="total" fill="#1A2C4E" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-[#e5e7eb] bg-white p-4">
        <h2 className="font-semibold text-sm mb-4" style={{ color: '#1A2C4E' }}>
          New Clients vs Leads (12 months)
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="new_clients"
              name="Clients"
              stroke="#1A2C4E"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="new_leads"
              name="Leads"
              stroke="#B8540A"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
