import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listProductsApi,
  getProductApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from '../api/productApi'
import type { ProductQueryParams, CreateProductDto, UpdateProductDto } from '@inventory/shared-types'

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  list: (params?: ProductQueryParams) => ['products', 'list', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
}

export function useProductList(params?: ProductQueryParams) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => listProductsApi(params),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: () => getProductApi(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateProductDto) => createProductApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) => updateProductApi(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  })
}
