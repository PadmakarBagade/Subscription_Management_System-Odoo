import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout';
import { CustomerLayout } from './components/layout/CustomerLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';

// Customer Portal Pages
import { PortalDashboard } from './pages/customer/PortalDashboard';
import { PortalSubscriptions } from './pages/customer/PortalSubscriptions';
import { PortalInvoices } from './pages/customer/PortalInvoices';
import { PortalPayments } from './pages/customer/PortalPayments';
import { PortalProfile } from './pages/customer/PortalProfile';

// Admin Workspace Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CustomersPage } from './pages/admin/CustomersPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { PlansPage } from './pages/admin/PlansPage';
import { QuotationsPage } from './pages/admin/QuotationsPage';
import { SubscriptionsPage } from './pages/admin/SubscriptionsPage';
import { InvoicesPage } from './pages/admin/InvoicesPage';
import { PaymentsPage } from './pages/admin/PaymentsPage';
import { BillingJobsPage } from './pages/admin/BillingJobsPage';
import { TaxesPage } from './pages/admin/TaxesPage';
import { DiscountsPage } from './pages/admin/DiscountsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SimulatorPage } from './pages/admin/SimulatorPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { AlertsPage } from './pages/admin/AlertsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RoleGuard } from './components/auth/RoleGuard';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  allowedRoles?: Array<'ADMIN' | 'STAFF' | 'CUSTOMER'>;
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return children;
};

// Public Only Route Guard (for login, register, etc.)
const PublicOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'CUSTOMER') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicOnlyRoute>
                <ResetPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* Customer Self-Service Portal Routes */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="subscriptions" element={<PortalSubscriptions />} />
            <Route path="invoices" element={<PortalInvoices />} />
            <Route path="payments" element={<PortalPayments />} />
            <Route path="profile" element={<PortalProfile />} />
          </Route>

          {/* Admin & Staff Workspace Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route
              path="billing-jobs"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <BillingJobsPage />
                </RoleGuard>
              }
            />
            <Route
              path="billing-health"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <BillingJobsPage />
                </RoleGuard>
              }
            />
            <Route
              path="users"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <UsersPage />
                </RoleGuard>
              }
            />
            <Route path="taxes" element={<TaxesPage />} />
            <Route path="discounts" element={<DiscountsPage />} />
            <Route
              path="reports"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <ReportsPage />
                </RoleGuard>
              }
            />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route
              path="audit-logs"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AuditLogsPage />
                </RoleGuard>
              }
            />
            <Route
              path="audit"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AuditLogsPage />
                </RoleGuard>
              }
            />
            <Route path="alerts" element={<AlertsPage />} />
          </Route>

          {/* Top-level aliases for direct URL typing */}
          <Route path="/users" element={<Navigate to="/admin/users" replace />} />
          <Route path="/audit" element={<Navigate to="/admin/audit-logs" replace />} />
          <Route path="/billing-health" element={<Navigate to="/admin/billing-jobs" replace />} />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
