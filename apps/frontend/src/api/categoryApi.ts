import { apiClient } from './client'
import type {
  CategoryListResponse,
  CategoryDetailResponse,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryParams,
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

export async function listCategoriesApi(params?: CategoryQueryParams): Promise<CategoryListResponse> {
  const { data } = await apiClient.get<CategoryListResponse>('/categories', { params })
  return data
}

export async function getCategoryApi(id: string): Promise<CategoryDetailResponse> {
  const { data } = await apiClient.get<CategoryDetailResponse>(`/categories/${id}`)
  return data
}

export async function createCategoryApi(dto: CreateCategoryDto): Promise<CategoryDetailResponse> {
  const { data } = await apiClient.post<CategoryDetailResponse>('/categories', dto, {
    headers: { 'Idempotency-Key': generateIdempotencyKey() },
  })
  return data
}

export async function updateCategoryApi(id: string, dto: UpdateCategoryDto): Promise<CategoryDetailResponse> {
  const { data } = await apiClient.put<CategoryDetailResponse>(`/categories/${id}`, dto)
  return data
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}
