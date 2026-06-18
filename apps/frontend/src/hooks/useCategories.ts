import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listCategoriesApi,
  getCategoryApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '../api/categoryApi'
import type { CategoryQueryParams, CreateCategoryDto, UpdateCategoryDto } from '@inventory/shared-types'

export const CATEGORY_KEYS = {
  all: ['categories'] as const,
  list: (params?: CategoryQueryParams) => ['categories', 'list', params] as const,
  detail: (id: string) => ['categories', 'detail', id] as const,
}

export function useCategoryList(params?: CategoryQueryParams) {
  return useQuery({
    queryKey: CATEGORY_KEYS.list(params),
    queryFn: () => listCategoriesApi(params),
  })
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: CATEGORY_KEYS.detail(id),
    queryFn: () => getCategoryApi(id),
    enabled: !!id,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => createCategoryApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) => updateCategoryApi(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategoryApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all }),
  })
}
