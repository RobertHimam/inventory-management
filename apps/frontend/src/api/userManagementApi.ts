import { apiClient } from './client'
import type {
  UserListResponse,
  UserDetailResponse,
  CreateUserDto,
  UserQueryParams,
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

export async function listUsersApi(params?: UserQueryParams): Promise<UserListResponse> {
  const { data } = await apiClient.get<UserListResponse>('/users', { params })
  return data
}

export async function getUserApi(id: string): Promise<UserDetailResponse> {
  const { data } = await apiClient.get<UserDetailResponse>(`/users/${id}`)
  return data
}

export async function createManagedUserApi(dto: CreateUserDto): Promise<UserDetailResponse> {
  const { data } = await apiClient.post<UserDetailResponse>('/users', dto, {
    headers: { 'Idempotency-Key': generateIdempotencyKey() },
  })
  return data
}

export async function deleteManagedUserApi(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`)
}
