import { useProductList } from '../hooks/useProducts'
import { useInventoryList } from '../hooks/useInventory'
import { useLowStockReport, useSalesReport } from '../hooks/useReports'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { InventoryValuePie } from '../components/dashboard/InventoryValuePie'
import { SalesOverTimeChart } from '../components/dashboard/SalesOverTimeChart'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function StatCard({ label, value, isLoading }: { label: string; value: number | undefined; isLoading: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {isLoading ? (
        <p className="mt-2 text-2xl font-bold text-slate-400 sm:text-3xl">Loading...</p>
      ) : (
        <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{value ?? 0}</p>
      )}
    </Card>
  )
}

function LowStockWidget({ fullWidth }: { fullWidth: boolean }) {
  const { data, isLoading, isError } = useLowStockReport()
  const items = data?.data?.lowStockItems ?? []
  const top = items.slice(0, 5)

  return (
    <Card className={`p-5 ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Low Stock Alerts</h2>
        {items.length > 0 && <Badge variant="danger">{items.length}</Badge>}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && <p className="text-sm text-red-600">Failed to load low stock.</p>}

      {!isLoading && !isError && (
        <>
          {top.length === 0 ? (
            <p className="text-sm text-slate-500">Everything is well stocked.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {top.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.sku}</p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-500">
                    <span className="font-medium text-red-600">{item.quantity}</span> / {item.reorderLevel}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <a href="/reports" className="mt-3 inline-block text-sm font-medium text-accent-600 hover:text-accent-700">
            View all →
          </a>
        </>
      )}
    </Card>
  )
}

function RecentSalesWidget() {
  const { data, isLoading, isError } = useSalesReport()
  const report = data?.data
  const top = report?.sales.slice(0, 5) ?? []

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Recent Sales</h2>
        {report && <Badge variant="success">{formatCurrency(report.totalSalesAmount)}</Badge>}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && <p className="text-sm text-red-600">Failed to load sales.</p>}

      {!isLoading && !isError && (
        top.length === 0 ? (
          <p className="text-sm text-slate-500">No sales yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {top.map((sale, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{sale.productName}</p>
                  <p className="text-xs text-slate-400">
                    {sale.quantity} × {formatCurrency(sale.price)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-slate-900">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        )
      )}
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === Role.ADMIN

  const products = useProductList({ limit: 1 })
  const inventory = useInventoryList({ limit: 1 })

  const hasError = products.isError || inventory.isError

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Dashboard" />

      {hasError && (
        <p role="alert" className="mb-4 text-red-600">
          Failed to load dashboard data. Please try again.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Products" value={products.data?.pagination.total} isLoading={products.isLoading} />
        <StatCard label="Inventory Items" value={inventory.data?.pagination.total} isLoading={inventory.isLoading} />
      </div>

      {isAdmin && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <InventoryValuePie />
          <SalesOverTimeChart />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LowStockWidget fullWidth={!isAdmin} />
        {isAdmin && <RecentSalesWidget />}
      </div>
    </div>
  )
}
