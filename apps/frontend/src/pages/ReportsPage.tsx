import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { useDashboardMetrics, useSalesReport, useInventoryValuation, useLowStockReport } from '../hooks/useReports'

type Tab = 'dashboard' | 'sales' | 'valuation' | 'low-stock'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function SectionError() {
  return <p role="alert" className="text-red-600 text-sm">Failed to load report. Please try again.</p>
}

function SectionLoading() {
  return <p className="text-gray-500 text-sm">Loading...</p>
}

function DashboardTab() {
  const { data, isLoading, isError } = useDashboardMetrics()

  if (isLoading) return <SectionLoading />
  if (isError) return <SectionError />

  const metrics = data?.data

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Total Products</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{metrics?.totalProducts ?? 0}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Inventory Value</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(metrics?.totalInventoryValue ?? 0)}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
        <p className="mt-2 text-3xl font-bold text-red-600">{metrics?.lowStockCount ?? 0}</p>
      </div>
    </div>
  )
}

function SalesTab() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeParams, setActiveParams] = useState<{ startDate?: string; endDate?: string }>({})

  const { data, isLoading, isError } = useSalesReport(activeParams)

  function handleFilter() {
    setActiveParams({
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    })
  }

  function handleClear() {
    setStartDate('')
    setEndDate('')
    setActiveParams({})
  }

  const report = data?.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Apply Filter
        </button>
        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && <SectionLoading />}
      {isError && <SectionError />}

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total Sales Amount</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(report.totalSalesAmount)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-500">Total Quantity Sold</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{report.totalQuantitySold}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No sales records found.</td>
                  </tr>
                ) : (
                  report.sales.map((sale, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{sale.productName}</td>
                      <td className="px-4 py-3 text-right">{sale.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(sale.price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ValuationTab() {
  const { data, isLoading, isError } = useInventoryValuation()

  if (isLoading) return <SectionLoading />
  if (isError) return <SectionError />

  const report = data?.data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Cost Valuation</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(report?.totalCostValuation ?? 0)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Retail Valuation</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(report?.totalRetailValuation ?? 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">SKU</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Cost</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Cost Val.</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Retail Val.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!report?.valuations?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">No inventory data found.</td>
              </tr>
            ) : (
              report.valuations.map((item) => (
                <tr key={item.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.sku}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.cost)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.costValuation)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.retailValuation)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LowStockTab() {
  const { data, isLoading, isError } = useLowStockReport()

  if (isLoading) return <SectionLoading />
  if (isError) return <SectionError />

  const items = data?.data?.lowStockItems ?? []

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">SKU</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Current Qty</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Reorder Level</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No low stock items.</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.productId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-gray-500">{item.sku}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-red-600">{item.quantity}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{item.reorderLevel}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ReportsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === Role.ADMIN

  const allTabs: { id: Tab; label: string; adminOnly: boolean }[] = [
    { id: 'dashboard', label: 'Overview', adminOnly: false },
    { id: 'sales', label: 'Sales', adminOnly: true },
    { id: 'valuation', label: 'Inventory Valuation', adminOnly: true },
    { id: 'low-stock', label: 'Low Stock', adminOnly: false },
  ]

  const visibleTabs = allTabs.filter((t) => !t.adminOnly || isAdmin)
  const [activeTab, setActiveTab] = useState<Tab>(visibleTabs[0].id)

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Report tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'sales' && isAdmin && <SalesTab />}
      {activeTab === 'valuation' && isAdmin && <ValuationTab />}
      {activeTab === 'low-stock' && <LowStockTab />}
    </div>
  )
}
