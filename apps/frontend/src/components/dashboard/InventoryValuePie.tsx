import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useInventoryValuation } from '../../hooks/useReports'
import { topByValue } from '../../lib/chartData'
import { Card } from '@/components/ui/card'

const COLORS = ['#059669', '#0891b2', '#6366f1', '#d97706', '#dc2626', '#94a3b8']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function InventoryValuePie() {
  const { data, isLoading, isError } = useInventoryValuation()
  const slices = topByValue(data?.data?.valuations ?? [])

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Inventory Value by Product</h2>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && <p className="text-sm text-red-600">Failed to load valuation.</p>}

      {!isLoading && !isError && (
        slices.length === 0 ? (
          <p className="text-sm text-slate-500">No inventory data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {slices.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      )}
    </Card>
  )
}
