import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const hasAccess = (perms?: string[]) => {
        if (!perms || perms.length === 0) return true;
        if (!user) return false;
        if (user.role === 'OWNER') return true;
        if (!user.permissions) return false;
        return perms.some(p => user.permissions.includes(p));
    };

    const navSections = [
        {
            label: 'Main',
            items: [
                { path: '/dashboard', icon: 'dashboard', label: 'Dashboard', perms: ['report.view', 'transaction.create'] },
                { path: '/transactions', icon: 'point_of_sale', label: 'Kasir', perms: ['transaction.create'] },
                { path: '/transaction-history', icon: 'receipt_long', label: 'Riwayat', perms: ['transaction.view_own', 'void.transaction', 'refund.process'] },
            ],
        },
        {
            label: 'Produk',
            items: [
                { path: '/products', icon: 'inventory_2', label: 'Produk', perms: ['product.view', 'product.crud'] },
                { path: '/categories', icon: 'category', label: 'Kategori', perms: ['category.manage'] },
                { path: '/inventory', icon: 'warehouse', label: 'Stok', perms: ['stock.view', 'stock.in_out', 'stock.opname'] },
            ],
        },
        {
            label: 'Manajemen',
            items: [
                { path: '/customers', icon: 'groups', label: 'Pelanggan', perms: ['customer.select', 'customer.manage'] },
                { path: '/vouchers', icon: 'confirmation_number', label: 'Voucher', perms: ['discount.manage'] },
                { path: '/cash-management', icon: 'payments', label: 'Kas', perms: ['cash.open_shift', 'cash.reconcile'] },
                { path: '/employees', icon: 'badge', label: 'Karyawan', perms: ['user.create_cashier', 'role.manage'] },
                { path: '/reports', icon: 'bar_chart', label: 'Laporan', perms: ['report.view'] },
                { path: '/discounts', icon: 'percent', label: 'Diskon', perms: ['discount.manage'] },
                { path: '/audit-logs', icon: 'shield', label: 'Audit Log', perms: ['activity_log.view', 'audit_log.full'] },
            ],
        },
    ];

    return (
        <aside className="w-64 flex flex-col border-r border-border-dark bg-background-dark overflow-y-auto flex-shrink-0">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-background-dark font-bold">point_of_sale</span>
                </div>
                <div>
                    <h1 className="text-white text-lg font-bold leading-tight">POS System</h1>
                    <p className="text-text-subtle text-xs font-medium">{user?.role || 'Admin Panel'}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2 space-y-8">
                {navSections.map((section) => {
                    const visibleItems = section.items.filter(item => hasAccess(item.perms));
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.label} className="flex flex-col gap-1">
                            <p className="px-3 text-xs font-bold text-text-subtle uppercase tracking-wider mb-2">{section.label}</p>
                            {visibleItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive(item.path)
                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                        : 'text-text-subtle hover:bg-card-hover hover:text-white border border-transparent'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined ${isActive(item.path) ? 'fill-1' : ''}`}>{item.icon}</span>
                                    <span className={`text-sm ${isActive(item.path) ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-border-dark mt-auto">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-subtle hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
                >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
