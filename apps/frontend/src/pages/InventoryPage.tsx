import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventoryList } from '../hooks/useInventory'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Button } from '@/components/ui/button'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

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
            <PrimaryButton onClick={() => navigate('/inventory/stock-in')}>
              Stock In
            </PrimaryButton>
            <Button variant="destructive" onClick={() => navigate('/inventory/stock-out')}>
              Stock Out
            </Button>
            <SecondaryButton onClick={() => navigate('/inventory/adjustment')}>
              Adjust
            </SecondaryButton>
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
        <Table aria-label="Inventory">
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reorder Level</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.productId}>
                <TableCell>{item.productName ?? item.productId}</TableCell>
                <TableCell className="text-muted-foreground">{item.sku ?? '—'}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell className="text-muted-foreground">{item.reorderLevel ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <SecondaryButton size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            Previous
          </SecondaryButton>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <SecondaryButton size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
            Next
          </SecondaryButton>
        </div>
      )}
    </div>
  )
}
