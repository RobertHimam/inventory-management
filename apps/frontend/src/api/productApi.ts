import { apiClient } from './client'
import type {
  ProductListResponse,
  ProductDetailResponse,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryParams,
} from '@inventory/shared-types'

export async function listProductsApi(params?: ProductQueryParams): Promise<ProductListResponse> {
  const { data } = await apiClient.get<ProductListResponse>('/products', { params })
  return data
}

export async function getProductApi(id: string): Promise<ProductDetailResponse> {
  const { data } = await apiClient.get<ProductDetailResponse>(`/products/${id}`)
  return data
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export async function createProductApi(dto: CreateProductDto): Promise<ProductDetailResponse> {
  const idempotencyKey = generateIdempotencyKey()
  const { data } = await apiClient.post<ProductDetailResponse>('/products', dto, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function updateProductApi(id: string, dto: UpdateProductDto): Promise<ProductDetailResponse> {
  const { data } = await apiClient.put<ProductDetailResponse>(`/products/${id}`, dto)
  return data
}

export async function deleteProductApi(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`)
}
