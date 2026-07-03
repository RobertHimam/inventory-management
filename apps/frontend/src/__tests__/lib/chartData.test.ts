import { salesByDay, topByValue } from '../../lib/chartData'
import type { SaleRecord, InventoryValuationItem } from '@inventory/shared-types'

function sale(createdAt: string, totalAmount: number): SaleRecord {
  return { productId: 'p', productName: 'X', quantity: 1, price: totalAmount, totalAmount, soldBy: 'u', createdAt }
}

function val(name: string, retailValuation: number): InventoryValuationItem {
  return { productId: name, name, sku: name, quantity: 1, cost: 0, price: 0, costValuation: 0, retailValuation }
}

describe('salesByDay', () => {
  it('sums amounts per day and sorts ascending', () => {
    const out = salesByDay([
      sale('2026-01-02T09:00:00.000Z', 50),
      sale('2026-01-01T10:00:00.000Z', 20),
      sale('2026-01-02T18:00:00.000Z', 30),
    ])
    expect(out).toEqual([
      { date: '2026-01-01', amount: 20 },
      { date: '2026-01-02', amount: 80 },
    ])
  })

  it('returns empty array for no sales', () => {
    expect(salesByDay([])).toEqual([])
  })
})

describe('topByValue', () => {
  it('returns top-N sorted desc and folds the rest into Other', () => {
    const out = topByValue(
      [val('A', 10), val('B', 40), val('C', 30), val('D', 5), val('E', 5)],
      3
    )
    expect(out).toEqual([
      { name: 'B', value: 40 },
      { name: 'C', value: 30 },
      { name: 'A', value: 10 },
      { name: 'Other', value: 10 },
    ])
  })

  it('omits Other when nothing remains', () => {
    const out = topByValue([val('A', 10), val('B', 20)], 5)
    expect(out).toEqual([
      { name: 'B', value: 20 },
      { name: 'A', value: 10 },
    ])
  })
})
