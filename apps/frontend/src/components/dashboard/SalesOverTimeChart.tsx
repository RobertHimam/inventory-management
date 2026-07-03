import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useSalesReport } from '../../hooks/useReports'
import { salesByDay } from '../../lib/chartData'
import { Card } from '@/components/ui/card'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function SalesOverTimeChart() {
  const { data, isLoading, isError } = useSalesReport()
  const points = salesByDay(data?.data?.sales ?? [])

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Sales Over Time</h2>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && <p className="text-sm text-red-600">Failed to load sales.</p>}

      {!isLoading && !isError && (
        points.length === 0 ? (
          <p className="text-sm text-slate-500">No sales yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" width={48} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="amount" stroke="#059669" fill="url(#salesFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )
      )}
    </Card>
  )
}
