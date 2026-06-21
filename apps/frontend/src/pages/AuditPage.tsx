import { useState } from 'react'
import type { AuditQueryParams } from '@inventory/shared-types'
import { useAuditList } from '../hooks/useAudit'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

const PAGE_LIMIT = 20

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
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Trail</h1>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <Input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-48"
        />
        <Input
          type="text"
          placeholder="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full sm:w-36"
        />
        <Input
          type="text"
          placeholder="Resource type"
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="w-full sm:w-36"
        />
        <PrimaryButton type="submit">
          Filter
        </PrimaryButton>
      </form>

      {isLoading && <div>Loading...</div>}
      {isError && <div className="text-red-600">Failed to load audit logs.</div>}

      {!isLoading && !isError && (
        <>
          <Table className="rounded-lg border border-gray-200">
            <TableHeader>
              <TableRow>
                {['Time', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'Correlation ID'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
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
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{log.correlationId}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <SecondaryButton size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                  Previous
                </SecondaryButton>
                <SecondaryButton size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
                  Next
                </SecondaryButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
