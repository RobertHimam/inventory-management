import { Routes, Route, Navigate } from 'react-router-dom'
import { Role } from '@inventory/shared-types'
import { Toaster } from 'sonner'
import { AppLayout } from './components/layout/AppLayout'
import { AuthGuard } from './components/guards/AuthGuard'
import { RoleGuard } from './components/guards/RoleGuard'
import LoginPage from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductCreatePage } from './pages/ProductCreatePage'
import { ProductEditPage } from './pages/ProductEditPage'
import { InventoryPage } from './pages/InventoryPage'
import { StockInPage } from './pages/StockInPage'
import { StockOutPage } from './pages/StockOutPage'
import { StockAdjustmentPage } from './pages/StockAdjustmentPage'
import { ReportsPage } from './pages/ReportsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { CategoryCreatePage } from './pages/CategoryCreatePage'
import { CategoryEditPage } from './pages/CategoryEditPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { SupplierCreatePage } from './pages/SupplierCreatePage'
import { SupplierEditPage } from './pages/SupplierEditPage'
import { UsersPage } from './pages/UsersPage'
import { UserCreatePage } from './pages/UserCreatePage'
import { AuditPage } from './pages/AuditPage'

const ADMIN_ONLY = [Role.ADMIN]

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route
          path="/products/new"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <ProductCreatePage />
            </RoleGuard>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <ProductEditPage />
            </RoleGuard>
          }
        />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route
          path="/inventory/stock-in"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <StockInPage />
            </RoleGuard>
          }
        />
        <Route
          path="/inventory/stock-out"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <StockOutPage />
            </RoleGuard>
          }
        />
        <Route
          path="/inventory/adjustment"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <StockAdjustmentPage />
            </RoleGuard>
          }
        />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route
          path="/categories"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <CategoriesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/categories/new"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <CategoryCreatePage />
            </RoleGuard>
          }
        />
        <Route
          path="/categories/:id/edit"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <CategoryEditPage />
            </RoleGuard>
          }
        />
        <Route
          path="/suppliers"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <SuppliersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/suppliers/new"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <SupplierCreatePage />
            </RoleGuard>
          }
        />
        <Route
          path="/suppliers/:id/edit"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <SupplierEditPage />
            </RoleGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <UsersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/users/new"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <UserCreatePage />
            </RoleGuard>
          }
        />
        <Route
          path="/audit"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <AuditPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Toaster />
    </>
  )
}
