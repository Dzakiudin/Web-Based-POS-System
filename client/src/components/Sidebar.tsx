import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    ReceiptText,
    Package,
    Tags,
    Warehouse,
    Users,
    Ticket,
    Wallet,
    UserCog,
    BarChart3,
    Percent,
    ShieldCheck,
    Settings,
} from 'lucide-react';
import { SideNavSection, SideNavItem } from '@astryxdesign/core/SideNav';
import { useAuth } from '../context/AuthContext';

interface NavItemDef {
    path: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    perms?: string[];
}

interface NavSectionDef {
    title: string;
    items: NavItemDef[];
}

const NAV_SECTIONS: NavSectionDef[] = [
    {
        title: 'Utama',
        items: [
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perms: ['report.view', 'transaction.create'] },
            { path: '/transactions', label: 'Kasir', icon: ShoppingCart, perms: ['transaction.create'] },
            { path: '/transaction-history', label: 'Riwayat', icon: ReceiptText, perms: ['transaction.view_own', 'void.transaction', 'refund.process'] },
        ],
    },
    {
        title: 'Produk',
        items: [
            { path: '/products', label: 'Produk', icon: Package, perms: ['product.view', 'product.crud'] },
            { path: '/categories', label: 'Kategori', icon: Tags, perms: ['category.manage'] },
            { path: '/inventory', label: 'Stok', icon: Warehouse, perms: ['stock.view', 'stock.in_out', 'stock.opname'] },
        ],
    },
    {
        title: 'Manajemen',
        items: [
            { path: '/customers', label: 'Pelanggan', icon: Users, perms: ['customer.select', 'customer.manage'] },
            { path: '/vouchers', label: 'Voucher', icon: Ticket, perms: ['discount.manage'] },
            { path: '/cash-management', label: 'Kas', icon: Wallet, perms: ['cash.open_shift', 'cash.reconcile'] },
            { path: '/employees', label: 'Karyawan', icon: UserCog, perms: ['user.create_cashier', 'role.manage'] },
            { path: '/reports', label: 'Laporan', icon: BarChart3, perms: ['report.view'] },
            { path: '/discounts', label: 'Diskon', icon: Percent, perms: ['discount.manage'] },
            { path: '/audit-logs', label: 'Audit Log', icon: ShieldCheck, perms: ['activity_log.view', 'audit_log.full'] },
            { path: '/settings', label: 'Pengaturan', icon: Settings, perms: ['role.manage', 'product.crud'] },
        ],
    },
];

export const NavMenuContent: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const hasAccess = (perms?: string[]) => {
        if (!perms || perms.length === 0) return true;
        if (!user) return false;
        if (user.role === 'OWNER') return true;
        if (!user.permissions) return false;
        return perms.some((p) => user.permissions.includes(p));
    };

    return (
        <>
            {NAV_SECTIONS.map((section) => {
                const visibleItems = section.items.filter((item) => hasAccess(item.perms));
                if (visibleItems.length === 0) return null;

                return (
                    <SideNavSection key={section.title} title={section.title}>
                        {visibleItems.map((item) => {
                            const IconComp = item.icon;
                            return (
                                <SideNavItem
                                    key={item.path}
                                    label={item.label}
                                    icon={<IconComp size={18} />}
                                    isSelected={location.pathname === item.path}
                                    onClick={() => {
                                        if (location.pathname !== item.path) {
                                            if ('startViewTransition' in document) {
                                                (document as any).startViewTransition(() => {
                                                    navigate(item.path);
                                                });
                                            } else {
                                                navigate(item.path);
                                            }
                                        }
                                        onNavigate?.();
                                    }}
                                />
                            );
                        })}
                    </SideNavSection>
                );
            })}
        </>
    );
};

export default NavMenuContent;
