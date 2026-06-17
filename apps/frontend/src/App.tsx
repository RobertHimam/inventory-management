import { Routes, Route, Navigate } from 'react-router-dom'
import { Role } from '@inventory/shared-types'
import { AppLayout } from './components/layout/AppLayout'
import { AuthGuard } from './components/guards/AuthGuard'
import { RoleGuard } from './components/guards/RoleGuard'
import LoginPage from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductCreatePage } from './pages/ProductCreatePage'
import { ProductEditPage } from './pages/ProductEditPage'
import { InventoryPage } from './pages/InventoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { UsersPage } from './pages/UsersPage'
import { AuditPage } from './pages/AuditPage'

const ADMIN_ONLY = [Role.ADMIN]

export default function App() {
  return (
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
          path="/suppliers"
          element={
            <RoleGuard allowedRoles={ADMIN_ONLY}>
              <SuppliersPage />
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
  )
}
