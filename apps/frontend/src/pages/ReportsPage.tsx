import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { useDashboardMetrics, useSalesReport, useInventoryValuation, useLowStockReport } from '../hooks/useReports'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

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
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <PrimaryButton onClick={handleFilter}>
          Apply Filter
        </PrimaryButton>
        {(startDate || endDate) && (
          <SecondaryButton onClick={handleClear}>
            Clear
          </SecondaryButton>
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

          <Table className="rounded-lg border border-gray-200 shadow-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No sales records found.</TableCell>
                </TableRow>
              ) : (
                report.sales.map((sale, i) => (
                  <TableRow key={i}>
                    <TableCell>{sale.productName}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

      <Table className="rounded-lg border border-gray-200 shadow-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Cost Val.</TableHead>
            <TableHead className="text-right">Retail Val.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!report?.valuations?.length ? (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No inventory data found.</TableCell>
            </TableRow>
          ) : (
            report.valuations.map((item) => (
              <TableRow key={item.productId}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.costValuation)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.retailValuation)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function LowStockTab() {
  const { data, isLoading, isError } = useLowStockReport()

  if (isLoading) return <SectionLoading />
  if (isError) return <SectionError />

  const items = data?.data?.lowStockItems ?? []

  return (
    <Table className="rounded-lg border border-gray-200 shadow-sm">
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Current Qty</TableHead>
          <TableHead className="text-right">Reorder Level</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No low stock items.</TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.productId}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">{item.sku}</TableCell>
              <TableCell className="text-right">
                <span className="font-medium text-red-600">{item.quantity}</span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{item.reorderLevel}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
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
              role="tab"
              aria-selected={activeTab === tab.id}
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
