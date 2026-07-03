import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useUserList, useDeleteManagedUser } from '../hooks/useUserManagement'
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

export function UsersPage() {
  const navigate = useNavigate()

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

  const { data, isLoading, isError } = useUserList({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
  })

  const { mutate: deleteUser } = useDeleteManagedUser()

  const users = data?.data ?? []
  const pagination = data?.pagination

  function handleConfirmDelete() {
    if (deleteId) {
      deleteUser(deleteId, {
        onSuccess: () => toast.success('User deleted successfully'),
        onError: () => toast.error('Failed to delete user'),
      })
      setDeleteId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Users">
        <PrimaryButton onClick={() => navigate('/users/new')}>Add User</PrimaryButton>
      </PageHeader>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search users"
        />
      </div>

      {isLoading && <p className="text-slate-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load users. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Users">
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <EmptyState message="No users found" colSpan={4} />
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <span
                          className={
                            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' +
                            (user.role === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700')
                          }
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => setDeleteId(user.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {pagination && pagination.totalPages > 1 && (
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
          title="Delete User"
          message="Are you sure you want to delete this user?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
