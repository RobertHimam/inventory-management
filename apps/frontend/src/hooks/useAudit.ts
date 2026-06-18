import { useQuery } from '@tanstack/react-query'
import type { AuditQueryParams } from '@inventory/shared-types'
import { listAuditLogsApi } from '../api/auditApi'

export const AUDIT_KEYS = {
  all: ['audit'] as const,
  list: (params?: AuditQueryParams) => [...AUDIT_KEYS.all, 'list', params] as const,
}

export function useAuditList(params?: AuditQueryParams) {
  return useQuery({
    queryKey: AUDIT_KEYS.list(params),
    queryFn: () => listAuditLogsApi(params),
  })
}
