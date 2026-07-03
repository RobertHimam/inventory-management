import { useState } from 'react'
import type { AuditQueryParams } from '@inventory/shared-types'
import { useAuditList } from '../hooks/useAudit'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

const PAGE_LIMIT = 20
const COLUMNS = ['Time', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'Correlation ID']

export function AuditPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')

  const params: AuditQueryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(search && { search }),
    ...(action && { action }),
    ...(resourceType && { resourceType }),
    order: 'desc',
  }

  const { data, isLoading, isError } = useAuditList(params)
  const logs = data?.data ?? []
  const pagination = data?.pagination

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Audit Trail" />

      <form
        onSubmit={handleSearch}
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Resource type"
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
        />
        <PrimaryButton type="submit" className="w-full sm:w-auto">
          Filter
        </PrimaryButton>
      </form>

      {isLoading && <div className="text-slate-500">Loading...</div>}
      {isError && <div className="text-red-600">Failed to load audit logs.</div>}

      {!isLoading && !isError && (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table aria-label="Audit logs">
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <EmptyState message="No audit logs found." colSpan={COLUMNS.length} />
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{log.username}</TableCell>
                        <TableCell className="whitespace-nowrap">{log.role}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{log.action}</TableCell>
                        <TableCell className="whitespace-nowrap">{log.resourceType}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">{log.resourceId}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {log.correlationId}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      )}
    </div>
  )
}
