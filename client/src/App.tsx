import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-[#060918]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-white/30 text-sm">Memuat...</span>
    </div>
  </div>
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
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="transaction-history" element={<TransactionHistory />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="customers" element={<Customers />} />
                <Route path="cash-management" element={<CashManagement />} />
                <Route path="employees" element={<Employees />} />
                <Route path="reports" element={<Reports />} />
                <Route path="vouchers" element={<Vouchers />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="discounts" element={<Discounts />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
