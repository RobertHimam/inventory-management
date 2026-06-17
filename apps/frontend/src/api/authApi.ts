import { apiClient } from './client'
import type { LoginDto, LoginResponse, RefreshResponse } from '@inventory/shared-types'

export async function loginApi(dto: LoginDto): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', dto)
  return data
}

export async function refreshTokenApi(): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh')
  return data
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout')
}
