import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'
import { useDashboardMetrics, useSalesReport, useInventoryValuation, useLowStockReport } from '../hooks/useReports'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

type Tab = 'dashboard' | 'sales' | 'valuation' | 'low-stock'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function SectionError() {
  return <p role="alert" className="text-red-600 text-sm">Failed to load report. Please try again.</p>
}

function SectionLoading() {
  return <p className="text-slate-500 text-sm">Loading...</p>
}

function MetricCard({ label, value, valueClass = 'text-slate-900' }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${valueClass}`}>{value}</p>
    </Card>
  )
}

function TableCard({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </Card>
  )
}

function DashboardTab() {
  const { data, isLoading, isError } = useDashboardMetrics()

  if (isLoading) return <SectionLoading />
  if (isError) return <SectionError />

  const metrics = data?.data

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MetricCard label="Total Products" value={metrics?.totalProducts ?? 0} />
      <MetricCard label="Inventory Value" value={formatCurrency(metrics?.totalInventoryValue ?? 0)} />
      <MetricCard label="Low Stock Items" value={metrics?.lowStockCount ?? 0} valueClass="text-red-600" />
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
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="startDate" className="mb-1 block text-xs text-slate-500">
            Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div>
          <Label htmlFor="endDate" className="mb-1 block text-xs text-slate-500">
            End Date
          </Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <PrimaryButton onClick={handleFilter}>Apply Filter</PrimaryButton>
        {(startDate || endDate) && <SecondaryButton onClick={handleClear}>Clear</SecondaryButton>}
      </div>

      {isLoading && <SectionLoading />}
      {isError && <SectionError />}

      {report && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard label="Total Sales Amount" value={formatCurrency(report.totalSalesAmount)} />
            <MetricCard label="Total Quantity Sold" value={report.totalQuantitySold} />
          </div>

          <TableCard>
            <Table>
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
                      <TableCell className="font-medium">{sale.productName}</TableCell>
                      <TableCell className="text-right">{sale.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(sale.totalAmount)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableCard>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Total Cost Valuation" value={formatCurrency(report?.totalCostValuation ?? 0)} />
        <MetricCard label="Total Retail Valuation" value={formatCurrency(report?.totalRetailValuation ?? 0)} />
      </div>

      <TableCard>
        <Table>
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
      </TableCard>
    </div>
  )
}

function LowStockTab() {
  const { data, isLoading, isError } = useLowStockReport()

  if (isLoading) return <SectionLoading />
  if (isError) return <SectionError />

  const items = data?.data?.lowStockItems ?? []

  return (
    <TableCard>
      <Table>
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
    </TableCard>
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader title="Reports" />

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Report tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-600 text-accent-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
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
