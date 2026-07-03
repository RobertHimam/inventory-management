import type { SaleRecord, InventoryValuationItem } from '@inventory/shared-types'

export interface DayPoint {
  date: string // YYYY-MM-DD
  amount: number
}

export interface SlicePoint {
  name: string
  value: number
}

/** Group raw sales into daily totals, sorted ascending by date. */
export function salesByDay(sales: SaleRecord[]): DayPoint[] {
  const totals = new Map<string, number>()
  for (const sale of sales) {
    const date = sale.createdAt.slice(0, 10) // ISO date portion
    totals.set(date, (totals.get(date) ?? 0) + sale.totalAmount)
  }
  return [...totals.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Top-N products by retail valuation, remainder folded into an "Other" slice. */
export function topByValue(valuations: InventoryValuationItem[], topN = 5): SlicePoint[] {
  const sorted = [...valuations].sort((a, b) => b.retailValuation - a.retailValuation)
  const top = sorted.slice(0, topN).map((v) => ({ name: v.name, value: v.retailValuation }))
  const rest = sorted.slice(topN).reduce((sum, v) => sum + v.retailValuation, 0)
  return rest > 0 ? [...top, { name: 'Other', value: rest }] : top
}
