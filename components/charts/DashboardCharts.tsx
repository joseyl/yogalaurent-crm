'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Tooltip,
} from 'recharts'
import { formatGBP } from '@/lib/utils'
import Collapsible from '@/components/ui/Collapsible'

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

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #E4E7EC',
  boxShadow: '0 4px 6px rgba(16, 24, 40, 0.08)',
  fontSize: '12px',
  padding: '8px 12px',
}

const axisTickStyle = { fontSize: 11, fill: '#667085' }

export default function DashboardCharts({ categoryRevenue, trend }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Collapsible title="Revenue This Month by Category" defaultOpen>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={categoryRevenue} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
            <XAxis
              dataKey="category"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatGBP(v)}
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              formatter={(v) => [formatGBP(Number(v)), 'Revenue']}
              contentStyle={tooltipStyle}
              cursor={{ fill: '#F5F6F8' }}
            />
            <Bar dataKey="total" fill="#0E7C86" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </Collapsible>

      <Collapsible title="New Clients vs Leads (12 months)" defaultOpen>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#667085' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#667085' }}
            />
            <Line
              type="monotone"
              dataKey="new_clients"
              name="Clients"
              stroke="#0E7C86"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="new_leads"
              name="Leads"
              stroke="#667085"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Collapsible>
    </div>
  )
}
