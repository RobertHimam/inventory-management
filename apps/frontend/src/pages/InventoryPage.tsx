import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventoryList } from '../hooks/useInventory'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const LIMIT = 10

export function InventoryPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === Role.ADMIN

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useInventoryList({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
  })

  const items = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/inventory/stock-in')}>
              Stock In
            </Button>
            <Button variant="destructive" onClick={() => navigate('/inventory/stock-out')}>
              Stock Out
            </Button>
            <Button variant="outline" onClick={() => navigate('/inventory/adjustment')}>
              Adjust
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <Input
          type="search"
          role="searchbox"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search inventory"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load inventory. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" aria-label="Inventory">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.productId}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.productName ?? item.productId}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.reorderLevel ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
