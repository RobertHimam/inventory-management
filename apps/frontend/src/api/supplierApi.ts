import { apiClient } from './client'
import type {
  SupplierListResponse,
  SupplierDetailResponse,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryParams,
} from '@inventory/shared-types'

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export async function listSuppliersApi(params?: SupplierQueryParams): Promise<SupplierListResponse> {
  const { data } = await apiClient.get<SupplierListResponse>('/suppliers', { params })
  return data
}

export async function getSupplierApi(id: string): Promise<SupplierDetailResponse> {
  const { data } = await apiClient.get<SupplierDetailResponse>(`/suppliers/${id}`)
  return data
}

export async function createSupplierApi(dto: CreateSupplierDto): Promise<SupplierDetailResponse> {
  const { data } = await apiClient.post<SupplierDetailResponse>('/suppliers', dto, {
    headers: { 'Idempotency-Key': generateIdempotencyKey() },
  })
  return data
}

export async function updateSupplierApi(id: string, dto: UpdateSupplierDto): Promise<SupplierDetailResponse> {
  const { data } = await apiClient.put<SupplierDetailResponse>(`/suppliers/${id}`, dto)
  return data
}

export async function deleteSupplierApi(id: string): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`)
}
