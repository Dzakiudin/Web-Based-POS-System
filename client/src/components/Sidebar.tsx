import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, LogOut, Store, ChevronRight, User, Receipt, Layers, BarChart3, Wallet, UserCog, PieChart, Gift, ScrollText, Percent } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const { logout, user } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const navSections = [
        {
            label: 'Main',
            items: [
                { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { path: '/transactions', icon: ShoppingCart, label: 'Kasir' },
                { path: '/transaction-history', icon: Receipt, label: 'Riwayat' },
            ],
        },
        {
            label: 'Produk',
            items: [
                { path: '/products', icon: Package, label: 'Produk' },
                { path: '/categories', icon: Layers, label: 'Kategori' },
                { path: '/inventory', icon: BarChart3, label: 'Stok' },
            ],
        },
        {
            label: 'Manajemen',
            items: [
                { path: '/customers', icon: Users, label: 'Pelanggan' },
                { path: '/vouchers', icon: Gift, label: 'Voucher' },
                { path: '/cash-management', icon: Wallet, label: 'Kas' },
                { path: '/employees', icon: UserCog, label: 'Karyawan' },
                { path: '/reports', icon: PieChart, label: 'Laporan' },
                { path: '/discounts', icon: Percent, label: 'Diskon' },
                { path: '/audit-logs', icon: ScrollText, label: 'Audit Log' },
            ],
        },
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] w-64 glass m-4 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-20 transition-all duration-500 hover:border-white/20">
            {/* Header */}
            <div className="flex items-center px-6 h-20 border-b border-white/5 bg-white/5 relative group">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-300">
                    <Store className="text-white w-6 h-6" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic">
                        POS Pro
                    </h1>
                    <div className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">v2.0</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
                {navSections.map((section) => (
                    <div key={section.label}>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] px-4 mb-2">{section.label}</p>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`group flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 relative text-sm ${isActive(item.path)
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <item.icon className={`mr-3 h-4 w-4 transition-transform duration-300 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="font-medium tracking-wide flex-1">
                                        {item.label}
                                    </span>
                                    {isActive(item.path) ? (
                                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profile Footer */}
            <div className="px-4 py-4 bg-white/5 border-t border-white/5 space-y-3">
                <div className="flex items-center px-4 py-2.5 bg-white/5 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all duration-300">
                    <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mr-3 group-hover:bg-indigo-600/30 transition-colors capitalize text-indigo-400 font-bold text-sm">
                        {user?.name?.[0] || <User size={16} />}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">{user?.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{user?.role}</span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex w-full items-center px-4 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-300 group font-medium text-sm"
                >
                    <LogOut className="mr-3 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
