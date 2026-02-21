import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { user } = useAuth();
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname.replace('/', '');
        const titles: Record<string, string> = {
            dashboard: 'Dashboard Overview',
            transactions: 'Kasir',
            'transaction-history': 'Riwayat Transaksi',
            products: 'Daftar Produk',
            categories: 'Kategori Produk',
            inventory: 'Manajemen Stok',
            customers: 'Pelanggan & CRM',
            'cash-management': 'Arus Kas Sesi',
            employees: 'Data Karyawan',
            reports: 'Laporan Bisnis & Keuangan',
            vouchers: 'Voucher & Promo Codes',
            'audit-logs': 'Security Audit Logs',
            discounts: 'Aturan Diskon Toko',
        };
        return titles[path] || 'Dashboard';
    };

    // Transactions page gets full-screen POS layout (no header)
    const isTransactionPage = location.pathname === '/transactions';

    return (
        <div className="flex h-screen w-full bg-background-dark text-slate-100 overflow-hidden">
            {!isTransactionPage && <Sidebar />}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Header — not shown on Transactions page */}
                {!isTransactionPage && (
                    <header className="flex-none flex items-center justify-between px-8 py-5 border-b border-border-dark bg-background-dark/50 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
                            <p className="text-text-subtle text-sm">Welcome back, {user?.name || 'Admin'}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Search */}
                            <div className="relative w-64 group hidden lg:block">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-text-subtle group-focus-within:text-primary transition-colors">search</span>
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg leading-5 bg-card-dark text-white placeholder-text-subtle focus:outline-none focus:bg-card-hover focus:ring-1 focus:ring-primary sm:text-sm transition-all shadow-sm"
                                    placeholder="Search orders, items..."
                                    type="text"
                                />
                            </div>
                            {/* Notifications */}
                            <button className="flex items-center justify-center size-10 rounded-lg bg-card-dark text-text-subtle hover:text-primary hover:bg-card-hover transition-colors relative">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full border-2 border-card-dark"></span>
                            </button>
                            <div className="h-8 w-px bg-border-dark mx-2"></div>
                            {/* User Profile */}
                            <div className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-card-dark border border-transparent hover:border-border-dark transition-all">
                                <div className="flex flex-col items-end px-2">
                                    <span className="text-xs font-bold text-white">{user?.name || 'Admin'}</span>
                                    <span className="text-[10px] text-text-subtle">{user?.role || 'Manager'}</span>
                                </div>
                                <div className="size-9 rounded-full bg-gradient-to-tr from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-background-dark">
                                    {user?.name?.[0]?.toUpperCase() || 'A'}
                                </div>
                            </div>
                        </div>
                    </header>
                )}
                {/* Main Content */}
                <main className={`flex-1 overflow-y-auto ${isTransactionPage ? '' : 'p-8'} scroll-smooth`}>
                    <div className={isTransactionPage ? 'h-full' : 'max-w-7xl mx-auto'}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
