import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useSupplierList, useDeleteSupplier } from '../hooks/useSuppliers'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Button } from '@/components/ui/button'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

const LIMIT = 10

export function SuppliersPage() {
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

  const { data, isLoading, isError } = useSupplierList({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
  })

  const { mutate: deleteSupplier } = useDeleteSupplier()

  const suppliers = data?.data ?? []
  const pagination = data?.pagination

  function handleConfirmDelete() {
    if (deleteId) {
      deleteSupplier(deleteId, {
        onSuccess: () => toast.success('Supplier deleted successfully'),
        onError: () => toast.error('Failed to delete supplier'),
      })
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        {isAdmin && (
          <PrimaryButton onClick={() => navigate('/suppliers/new')}>
            Add Supplier
          </PrimaryButton>
        )}
      </div>

      <div className="mb-4">
        <input
          type="search"
          role="searchbox"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Search suppliers"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load suppliers. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <Table aria-label="Suppliers">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier._id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.contactEmail ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.phone ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.address ?? '-'}</TableCell>
                {isAdmin && (
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/suppliers/${supplier._id}/edit`)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => setDeleteId(supplier._id)}>
                      Delete
                    </Button>
                  </TableCell>
                )}
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

      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
            <p className="text-gray-800 mb-4">Are you sure you want to delete this supplier?</p>
            <div className="flex justify-end space-x-3">
              <SecondaryButton onClick={() => setDeleteId(null)}>
                Cancel
              </SecondaryButton>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
