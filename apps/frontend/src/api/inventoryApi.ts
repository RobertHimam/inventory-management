import { apiClient } from './client'
import type {
  InventoryListResponse,
  InventoryDetailResponse,
  StockTransactionResponse,
  StockInDto,
  StockOutDto,
  StockAdjustmentDto,
  InventoryQueryParams,
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

export async function listInventoryApi(params?: InventoryQueryParams): Promise<InventoryListResponse> {
  const { data } = await apiClient.get<InventoryListResponse>('/inventory', { params })
  return data
}

export async function getInventoryItemApi(productId: string): Promise<InventoryDetailResponse> {
  const { data } = await apiClient.get<InventoryDetailResponse>(`/inventory/${productId}`)
  return data
}

export async function stockInApi(dto: StockInDto): Promise<StockTransactionResponse> {
  const idempotencyKey = generateIdempotencyKey()
  const { data } = await apiClient.post<StockTransactionResponse>('/inventory/stock-in', dto, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function stockOutApi(dto: StockOutDto): Promise<StockTransactionResponse> {
  const idempotencyKey = generateIdempotencyKey()
  const { data } = await apiClient.post<StockTransactionResponse>('/inventory/stock-out', dto, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function stockAdjustApi(dto: StockAdjustmentDto): Promise<StockTransactionResponse> {
  const idempotencyKey = generateIdempotencyKey()
  const { data } = await apiClient.post<StockTransactionResponse>('/inventory/adjust', dto, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}
