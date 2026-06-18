import { apiClient } from './client'
import type { AuditListResponse, AuditQueryParams } from '@inventory/shared-types'

const BASE = '/audit/api/v1/audit'

export async function listAuditLogsApi(params?: AuditQueryParams): Promise<AuditListResponse> {
  const { data } = await apiClient.get<AuditListResponse>(BASE, { params })
  return data
}
