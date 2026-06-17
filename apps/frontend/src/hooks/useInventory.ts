import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listInventoryApi,
  getInventoryItemApi,
  stockInApi,
  stockOutApi,
  stockAdjustApi,
} from '../api/inventoryApi'
import type { InventoryQueryParams, StockInDto, StockOutDto, StockAdjustmentDto } from '@inventory/shared-types'

export const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  list: (params?: InventoryQueryParams) => ['inventory', 'list', params] as const,
  detail: (productId: string) => ['inventory', 'detail', productId] as const,
}

export function useInventoryList(params?: InventoryQueryParams) {
  return useQuery({
    queryKey: INVENTORY_KEYS.list(params),
    queryFn: () => listInventoryApi(params),
  })
}

export function useInventoryItem(productId: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.detail(productId),
    queryFn: () => getInventoryItemApi(productId),
    enabled: !!productId,
  })
}

export function useStockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: StockInDto) => stockInApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all }),
  })
}

export function useStockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: StockOutDto) => stockOutApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all }),
  })
}

export function useStockAdjust() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: StockAdjustmentDto) => stockAdjustApi(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all }),
  })
}
