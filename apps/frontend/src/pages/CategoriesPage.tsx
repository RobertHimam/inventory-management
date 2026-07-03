import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCategoryList, useDeleteCategory } from '../hooks/useCategories'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { Button } from '@/components/ui/button'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

const LIMIT = 10

export function CategoriesPage() {
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

  const { data, isLoading, isError } = useCategoryList({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
  })

  const { mutate: deleteCategory } = useDeleteCategory()

  const categories = data?.data ?? []
  const pagination = data?.pagination

  function handleConfirmDelete() {
    if (deleteId) {
      deleteCategory(deleteId, {
        onSuccess: () => toast.success('Category deleted successfully'),
        onError: () => toast.error('Failed to delete category'),
      })
      setDeleteId(null)
    }
  }

  const colCount = isAdmin ? 3 : 2

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Categories">
        {isAdmin && (
          <PrimaryButton onClick={() => navigate('/categories/new')}>Add Category</PrimaryButton>
        )}
      </PageHeader>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search categories"
        />
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load categories. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Categories">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <EmptyState message="No categories found" colSpan={colCount} />
                ) : (
                  categories.map((category) => (
                    <TableRow key={category._id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.description ?? '-'}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/categories/${category._id}/edit`)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => setDeleteId(category._id)}>
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
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Category"
          message="Are you sure you want to delete this category?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
