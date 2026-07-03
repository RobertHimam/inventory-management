import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProductList, useDeleteProduct } from '../hooks/useProducts'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Button } from '@/components/ui/button'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

const LIMIT = 10

export function ProductsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === Role.ADMIN

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useProductList({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
  })

  const { mutate: deleteProduct } = useDeleteProduct()

  const products = data?.data ?? []
  const pagination = data?.pagination
  const colCount = isAdmin ? 7 : 6

  function handleConfirmDelete() {
    if (deleteId) {
      deleteProduct(deleteId, {
        onSuccess: () => toast.success('Product deleted successfully'),
        onError: () => toast.error('Failed to delete product'),
      })
      setDeleteId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Products">
        {isAdmin && <PrimaryButton onClick={() => navigate('/products/new')}>Add Product</PrimaryButton>}
      </PageHeader>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search products"
        />
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load products. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Products">
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <EmptyState message="No products found" colSpan={colCount} />
                ) : (
                  products.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.category}</TableCell>
                      <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.stockQuantity}</TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? 'success' : 'default'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${product._id}/edit`)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => setDeleteId(product._id)}>
                            Delete
                          </Button>
                        </TableCell>
                      )}
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

      {deleteId && (
        <ConfirmDialog
          title="Delete Product"
          message="Are you sure you want to delete this product?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
