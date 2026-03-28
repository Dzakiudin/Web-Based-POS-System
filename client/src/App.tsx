import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import HasPermission from './components/HasPermission';
import Unauthorized from './pages/Unauthorized';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Customers = lazy(() => import('./pages/Customers'));
const Transactions = lazy(() => import('./pages/Transactions'));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory'));
const Categories = lazy(() => import('./pages/Categories'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reports = lazy(() => import('./pages/Reports'));
const CashManagement = lazy(() => import('./pages/CashManagement'));
const Employees = lazy(() => import('./pages/Employees'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Discounts = lazy(() => import('./pages/Discounts'));


const RouteGuard = ({ children, permission }: { children: React.ReactNode, permission: string | string[] }) => (
  <HasPermission permission={permission} fallback={<Unauthorized />}>
    {children}
  </HasPermission>
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<RouteGuard permission={['report.view', 'transaction.create']}><Dashboard /></RouteGuard>} />
                <Route path="transactions" element={<RouteGuard permission={['transaction.create']}><Transactions /></RouteGuard>} />
                <Route path="transaction-history" element={<RouteGuard permission={['transaction.view_own', 'void.transaction', 'refund.process']}><TransactionHistory /></RouteGuard>} />
                <Route path="products" element={<RouteGuard permission={['product.view', 'product.crud']}><Products /></RouteGuard>} />
                <Route path="categories" element={<RouteGuard permission={['category.manage']}><Categories /></RouteGuard>} />
                <Route path="inventory" element={<RouteGuard permission={['stock.view', 'stock.in_out', 'stock.opname']}><Inventory /></RouteGuard>} />
                <Route path="customers" element={<RouteGuard permission={['customer.select', 'customer.manage']}><Customers /></RouteGuard>} />
                <Route path="cash-management" element={<RouteGuard permission={['cash.open_shift', 'cash.reconcile']}><CashManagement /></RouteGuard>} />
                <Route path="employees" element={<RouteGuard permission={['user.create_cashier', 'role.manage']}><Employees /></RouteGuard>} />
                <Route path="reports" element={<RouteGuard permission={['report.view']}><Reports /></RouteGuard>} />
                <Route path="vouchers" element={<RouteGuard permission={['discount.manage']}><Vouchers /></RouteGuard>} />
                <Route path="audit-logs" element={<RouteGuard permission={['activity_log.view', 'audit_log.full']}><AuditLogs /></RouteGuard>} />
                <Route path="discounts" element={<RouteGuard permission={['discount.manage']}><Discounts /></RouteGuard>} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
