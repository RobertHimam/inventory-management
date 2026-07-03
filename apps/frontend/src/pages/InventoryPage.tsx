import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventoryList } from '../hooks/useInventory'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Button } from '@/components/ui/button'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Inventory">
        {isAdmin && (
          <>
            <PrimaryButton onClick={() => navigate('/inventory/stock-in')}>Stock In</PrimaryButton>
            <Button variant="destructive" onClick={() => navigate('/inventory/stock-out')}>
              Stock Out
            </Button>
            <SecondaryButton onClick={() => navigate('/inventory/adjustment')}>Adjust</SecondaryButton>
          </>
        )}
      </PageHeader>

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

      {isLoading && <p className="text-slate-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load inventory. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
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
                {items.length === 0 ? (
                  <EmptyState message="No inventory items found" colSpan={5} />
                ) : (
                  items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName ?? item.productId}</TableCell>
                      <TableCell className="text-muted-foreground">{item.sku ?? '—'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.reorderLevel ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {pagination && (
        <div className="mt-4 flex items-center justify-between">
          <SecondaryButton size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            Previous
          </SecondaryButton>
          <span className="text-sm text-slate-600">
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
