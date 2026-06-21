import { useProductList } from '../hooks/useProducts'
import { useInventoryList } from '../hooks/useInventory'
import { Button } from '@/components/ui/button'

function StatCard({ label, value, isLoading }: { label: string; value: number | undefined; isLoading: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {isLoading ? (
        <p className="mt-2 text-3xl font-bold text-gray-400">Loading...</p>
      ) : (
        <p className="mt-2 text-3xl font-bold text-gray-900">{value ?? 0}</p>
      )}
    </div>
  )
}

export function DashboardPage() {
  const products = useProductList({ limit: 1 })
  const inventory = useInventoryList({ limit: 1 })

  const hasError = products.isError || inventory.isError

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {hasError && (
        <p role="alert" className="mb-4 text-red-600">
          Failed to load dashboard data. Please try again.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Products"
          value={products.data?.pagination.total}
          isLoading={products.isLoading}
        />
        <StatCard
          label="Inventory Items"
          value={inventory.data?.pagination.total}
          isLoading={inventory.isLoading}
        />
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href="/products">View Products</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/inventory">View Inventory</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/reports">View Reports</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
