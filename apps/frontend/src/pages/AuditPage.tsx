import { useState } from 'react'
import type { AuditQueryParams } from '@inventory/shared-types'
import { useAuditList } from '../hooks/useAudit'

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
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-48"
        />
        <input
          type="text"
          placeholder="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-36"
        />
        <input
          type="text"
          placeholder="Resource type"
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-36"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Filter
        </button>
      </form>

      {isLoading && <div>Loading...</div>}
      {isError && <div className="text-red-600">Failed to load audit logs.</div>}

      {!isLoading && !isError && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Time', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'Correlation ID'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{log.username}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{log.role}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{log.action}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{log.resourceType}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{log.resourceId}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-400">{log.correlationId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
