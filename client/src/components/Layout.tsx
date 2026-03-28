import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'warning' | 'info' | 'success';
}

const Layout = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await api.get('/products');
                const products = response.data;
                const lowStock = products.filter((p: any) => p.stock <= p.minStock);

                const alerts: Notification[] = lowStock.map((p: any) => ({
                    id: `stock-${p.id}`,
                    title: 'Stok Rendah',
                    message: `${p.name} hanya tersisa ${p.stock} item`,
                    time: 'Baru saja',
                    type: 'warning'
                }));
                setNotifications(alerts);
            } catch (error) {
                console.error('Error fetching notifications', error);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

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
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className={`flex items-center justify-center size-10 rounded-lg transition-all relative ${showNotifications ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'bg-card-dark text-text-subtle hover:text-primary hover:bg-card-hover'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">notifications</span>
                                    {notifications.length > 0 && (
                                        <span className={`absolute top-2.5 right-2.5 size-2 rounded-full border-2 ${showNotifications ? 'bg-background-dark border-primary' : 'bg-primary border-card-dark'}`}></span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-3 w-80 bg-card-dark border border-border-dark rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-4 border-b border-border-dark flex items-center justify-between bg-background-dark/30">
                                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
                                                Notifikasi
                                            </h3>
                                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">
                                                {notifications.length} Baru
                                            </span>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                <div className="divide-y divide-border-dark/50">
                                                    {notifications.map((n) => (
                                                        <div key={n.id} className="p-4 hover:bg-card-hover transition-colors cursor-pointer group">
                                                            <div className="flex gap-3">
                                                                <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                                                                    }`}>
                                                                    <span className="material-symbols-outlined text-sm">
                                                                        {n.type === 'warning' ? 'warning' : 'info'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{n.title}</p>
                                                                    <p className="text-[11px] text-text-subtle mt-0.5 leading-relaxed">{n.message}</p>
                                                                    <p className="text-[9px] text-text-subtle/50 font-bold uppercase tracking-wider mt-2">{n.time}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                                                    <div className="size-12 rounded-full bg-background-dark flex items-center justify-center mb-3">
                                                        <span className="material-symbols-outlined text-text-subtle/20 text-2xl">notifications_off</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white mb-1">Tidak ada notifikasi</p>
                                                    <p className="text-[11px] text-text-subtle">Semua sistem berjalan normal</p>
                                                </div>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <Link
                                                to="/inventory"
                                                onClick={() => setShowNotifications(false)}
                                                className="block p-3 text-center text-[10px] font-bold text-text-subtle hover:text-primary transition-colors border-t border-border-dark uppercase tracking-widest"
                                            >
                                                Cek Inventaris
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="h-8 w-px bg-border-dark mx-2"></div>

                            {/* User Profile */}
                            <div className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-card-dark border border-transparent hover:border-border-dark transition-all">
                                <div className="flex flex-col items-end px-2">
                                    <span className="text-xs font-bold text-white">{user?.name || 'Admin'}</span>
                                    <span className="text-[10px] text-text-subtle uppercase font-bold tracking-wider">{user?.role || 'Manager'}</span>
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
                    <div className={isTransactionPage ? 'h-full' : 'max-w-[1600px] mx-auto w-full'}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
