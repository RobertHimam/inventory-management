import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listUsersApi,
  getUserApi,
  createManagedUserApi,
  deleteManagedUserApi,
} from '../api/userManagementApi'
import type { UserQueryParams, CreateUserDto } from '@inventory/shared-types'

export const USER_MGMT_KEYS = {
  all: ['managed-users'] as const,
  list: (params?: UserQueryParams) => ['managed-users', 'list', params] as const,
  detail: (id: string) => ['managed-users', 'detail', id] as const,
}

export function useUserList(params?: UserQueryParams) {
  return useQuery({
    queryKey: USER_MGMT_KEYS.list(params),
    queryFn: () => listUsersApi(params),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: USER_MGMT_KEYS.detail(id),
    queryFn: () => getUserApi(id),
    enabled: !!id,
  })
}

export function useCreateManagedUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) => createManagedUserApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_MGMT_KEYS.all }),
  })
}

export function useDeleteManagedUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteManagedUserApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_MGMT_KEYS.all }),
  })
}
