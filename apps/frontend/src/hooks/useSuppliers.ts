import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSuppliersApi,
  getSupplierApi,
  createSupplierApi,
  updateSupplierApi,
  deleteSupplierApi,
} from '../api/supplierApi'
import type { SupplierQueryParams, CreateSupplierDto, UpdateSupplierDto } from '@inventory/shared-types'

export const SUPPLIER_KEYS = {
  all: ['suppliers'] as const,
  list: (params?: SupplierQueryParams) => ['suppliers', 'list', params] as const,
  detail: (id: string) => ['suppliers', 'detail', id] as const,
}

export function useSupplierList(params?: SupplierQueryParams) {
  return useQuery({
    queryKey: SUPPLIER_KEYS.list(params),
    queryFn: () => listSuppliersApi(params),
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: SUPPLIER_KEYS.detail(id),
    queryFn: () => getSupplierApi(id),
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSupplierDto) => createSupplierApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all }),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSupplierDto }) => updateSupplierApi(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all }),
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSupplierApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all }),
  })
}
