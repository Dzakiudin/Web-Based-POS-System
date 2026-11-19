import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Store,
    Bell,
    LogOut,
    AlertTriangle,
    ArrowRight,
    CircleDot,
    Search,
    PanelLeftClose,
    PanelLeftOpen,
    KeyRound,
    ChevronDown,
    Package,
    Tags,
    Warehouse,
    Ticket,
    Percent,
    Wallet,
    Users,
    UserCog,
    BarChart3,
    ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav } from '@astryxdesign/core/SideNav';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { Drawer } from '@astryxdesign/core/Drawer';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { DropdownMenu, DropdownMenuItem, DropdownMenuDivider } from '@astryxdesign/core/DropdownMenu';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { NavMenuContent } from './Sidebar';
import BottomNavBar from './BottomNavBar';
import Modal from './Modal';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
}

const QUICK_ROUTES = [
    { path: '/dashboard', label: 'Dashboard Overview', desc: 'Ringkasan performa & grafik' },
    { path: '/transactions', label: 'Kasir POS', desc: 'Mulai transaksi penjualan baru' },
    { path: '/transaction-history', label: 'Riwayat Transaksi', desc: 'Struk, void, dan refund' },
    { path: '/products', label: 'Daftar Produk', desc: 'Tambah & kelola katalog produk' },
    { path: '/categories', label: 'Kategori Produk', desc: 'Kelompokkan item toko' },
    { path: '/inventory', label: 'Manajemen Stok', desc: 'Stok rendah & penyesuaian opname' },
    { path: '/customers', label: 'Pelanggan & CRM', desc: 'Member & poin loyalitas' },
    { path: '/cash-management', label: 'Arus Kas Sesi', desc: 'Buka/tutup shift kasir' },
    { path: '/reports', label: 'Laporan Bisnis', desc: 'Omzet, profit, dan jam ramai' },
    { path: '/vouchers', label: 'Voucher & Promo', desc: 'Kode promo pelanggan' },
    { path: '/discounts', label: 'Aturan Diskon', desc: 'Diskon persentase & nominal' },
    { path: '/employees', label: 'Data Karyawan', desc: 'Kelola akun kasir & admin' },
    { path: '/audit-logs', label: 'Audit Logs', desc: 'Riwayat aktivitas keamanan' },
];

const PAGE_TITLES: Record<string, string> = {
    dashboard: 'Dashboard',
    transactions: 'Kasir POS',
    'transaction-history': 'Riwayat Transaksi',
    products: 'Daftar Produk',
    categories: 'Kategori Produk',
    inventory: 'Manajemen Stok',
    customers: 'Pelanggan & CRM',
    'cash-management': 'Arus Kas Sesi',
    employees: 'Data Karyawan',
    reports: 'Laporan Bisnis',
    vouchers: 'Voucher & Promo',
    'audit-logs': 'Audit Logs',
    discounts: 'Aturan Diskon',
};

const Layout = () => {
    const { user, logout } = useAuth();
    const toast = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTransactionPage = location.pathname === '/transactions';

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isTransactionPage);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showQuickJump, setShowQuickJump] = useState(false);
    const [quickQuery, setQuickQuery] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hasActiveShift, setHasActiveShift] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

    const smoothNavigate = (to: string) => {
        if (location.pathname === to) return;
        navigate(to);
    };

    // Network connection status detection
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Koneksi sistem pulih (Online)');
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('Koneksi terputus (Offline mode)');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Change Password modal state
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Auto-collapse sidebar on POS Kasir page for maximum catalog space
    useEffect(() => {
        if (isTransactionPage) {
            setIsSidebarCollapsed(true);
        }
    }, [isTransactionPage]);

    // Keyboard shortcut Ctrl+K / Cmd+K for quick navigation
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setQuickQuery('');
                setShowQuickJump((prev) => !prev);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        const fetchAlertsAndShift = async () => {
            try {
                const [prodRes, shiftRes] = await Promise.allSettled([
                    api.get('/products'),
                    api.get('/cash-sessions/active'),
                ]);

                if (prodRes.status === 'fulfilled') {
                    const products = Array.isArray(prodRes.value.data) ? prodRes.value.data : [];
                    const lowStock = products.filter((p: any) => p.stock <= (p.minStock ?? 5));
                    setNotifications(
                        lowStock.map((p: any) => ({
                            id: `stock-${p.id}`,
                            title: 'Stok Rendah',
                            message: `${p.name} hanya tersisa ${p.stock} item`,
                            time: 'Baru saja',
                        }))
                    );
                }

                if (shiftRes.status === 'fulfilled' && shiftRes.value.data?.id) {
                    setHasActiveShift(true);
                } else {
                    setHasActiveShift(false);
                }
            } catch (error) {
                console.error('Error fetching header status', error);
            }
        };

        fetchAlertsAndShift();
        const interval = setInterval(fetchAlertsAndShift, 60000);
        return () => clearInterval(interval);
    }, [location.pathname]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.warning('Password minimal 6 karakter');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi password tidak cocok');
            return;
        }
        if (!user?.id) return;
        setIsSavingPassword(true);
        try {
            await api.post(`/users/${user.id}/reset-password`, { newPassword });
            toast.success('Password berhasil diperbarui');
            setShowChangePassword(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal mengganti password');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const pathKey = location.pathname.replace('/', '');
    const pageTitle = PAGE_TITLES[pathKey] || 'Dashboard';

    const filteredQuickRoutes = QUICK_ROUTES.filter(
        (r) =>
            r.label.toLowerCase().includes(quickQuery.toLowerCase()) ||
            r.desc.toLowerCase().includes(quickQuery.toLowerCase())
    );

    const sideNavElement = (
        <SideNav
            collapsible={{
                isCollapsed: isSidebarCollapsed,
                onCollapsedChange: setIsSidebarCollapsed,
                hasButton: false,
            }}
        >
            <NavMenuContent />
        </SideNav>
    );

    const topNavElement = (
        <TopNav
            label="Navigasi atas"
            style={{
                minHeight: isMobile ? 60 : 64,
                padding: isMobile ? '8px 16px' : '10px 24px',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                borderBottom: '1px solid #e4e4e7',
                backgroundColor: '#ffffff',
            }}
            startContent={
                isMobile ? undefined : (
                    <IconButton
                        variant="ghost"
                        size="sm"
                        label={isSidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                        tooltip={isSidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                        icon={isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    />
                )
            }
            heading={
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 11,
                            background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 7px rgba(0, 0, 0, 0.14)',
                            flexShrink: 0,
                        }}
                    >
                        <Store size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16, fontWeight: 750, color: '#09090b', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                                POS System
                            </span>
                            <span
                                style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    backgroundColor: isOnline ? '#16a34a' : '#ef4444',
                                    boxShadow: isOnline ? '0 0 6px rgba(22, 163, 74, 0.7)' : 'none',
                                    display: 'inline-block',
                                }}
                                title={isOnline ? 'Sistem Terhubung (Online)' : 'Jaringan Terputus (Offline)'}
                            />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#52525b', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                            {pageTitle}
                        </span>
                    </div>
                </div>
            }
            endContent={
                <HStack gap={isMobile ? 2.5 : 2.5} align="center" paddingInlineEnd={isMobile ? 0 : 2}>
                    {!isMobile && (
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={
                                <CircleDot
                                    size={14}
                                    color={hasActiveShift ? '#16a34a' : '#a1a1aa'}
                                />
                            }
                            label={hasActiveShift ? 'Shift Aktif' : 'Shift Tutup'}
                            onClick={() => smoothNavigate('/cash-management')}
                        />
                    )}

                    {/* Notification Bell Button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowNotifications(true)}
                            aria-label="Lihat notifikasi"
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 11,
                                border: '1px solid #e4e4e7',
                                backgroundColor: '#ffffff',
                                color: '#3f3f46',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                            }}
                        >
                            <Bell size={18} />
                        </button>
                        {notifications.length > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: -3,
                                    right: -3,
                                    minWidth: 16,
                                    height: 16,
                                    padding: '0 4px',
                                    borderRadius: 999,
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #ffffff',
                                }}
                            >
                                {notifications.length}
                            </span>
                        )}
                    </div>

                    {!isMobile && (
                        <div style={{ width: 1, height: 22, backgroundColor: '#e4e4e7' }} />
                    )}

                    {/* Profile Dropdown (Desktop) / Quick Menu Trigger (Mobile) */}
                    {isMobile ? (
                        <button
                            type="button"
                            onClick={() => setShowMobileMenu(true)}
                            aria-label="Buka menu profil kasir"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                            }}
                        >
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 11,
                                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
                                    border: '1.5px solid #ffffff',
                                }}
                            >
                                {(user?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                        </button>
                    ) : (
                        <DropdownMenu
                            alignment="end"
                            menuWidth={220}
                            renderTrigger={(triggerProps) => (
                                <button
                                    {...(triggerProps as any)}
                                    type="button"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '4px 10px 4px 4px',
                                        borderRadius: 999,
                                        border: '1px solid #e4e4e7',
                                        backgroundColor: '#ffffff',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Avatar name={user?.name || 'Admin'} size="sm" />
                                    <VStack align="start" gap={0}>
                                        <Text size="sm" weight="semibold">{user?.name || 'Admin'}</Text>
                                        <Text size="2xs" color="secondary">{user?.role || 'OWNER'}</Text>
                                    </VStack>
                                    <ChevronDown size={14} color="#71717a" />
                                </button>
                            )}
                        >
                            <DropdownMenuItem
                                label="Ganti Password"
                                description="Ubah kata sandi akun Anda"
                                icon={<KeyRound size={15} />}
                                onClick={() => {
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setShowChangePassword(true);
                                }}
                            />
                            <DropdownMenuDivider />
                            <DropdownMenuItem
                                label="Keluar"
                                description="Akhiri sesi login"
                                icon={<LogOut size={15} />}
                                variant="destructive"
                                onClick={logout}
                            />
                        </DropdownMenu>
                    )}
                </HStack>
            }
        />
    );

    return (
        <>
            <AppShell
                height="fill"
                variant="wash"
                contentPadding={0}
                topNav={topNavElement}
                sideNav={isMobile ? undefined : sideNavElement}
            >
                <div
                    key={location.pathname}
                    className="pos-page-enter"
                    style={{
                        width: '100%',
                        maxWidth: isTransactionPage ? '100%' : 1400,
                        height: isTransactionPage ? '100%' : undefined,
                        margin: '0 auto',
                        padding: isTransactionPage ? 0 : isMobile ? '12px 14px' : '24px 32px',
                        paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom, 12px))' : '36px',
                        boxSizing: 'border-box',
                    }}
                >
                    <Outlet />
                </div>
            </AppShell>

            {/* Mobile Bottom Navigation Bar */}
            {isMobile && (
                <BottomNavBar
                    onOpenMenu={() => setShowMobileMenu(true)}
                />
            )}

            {/* Native Mobile Menu & Operations BottomSheet */}
            <BottomSheet
                isOpen={showMobileMenu}
                onOpenChange={setShowMobileMenu}
                label="Menu & Fitur Lengkap"
                height="tall"
                padding={4}
            >
                <VStack gap={4} paddingBlockEnd={6}>
                    {/* User Profile Card */}
                    <Card padding={3} variant="muted" elevation="none">
                        <HStack justify="between" align="center">
                            <HStack gap={3} align="center">
                                <Avatar name={user?.name || 'Admin'} size="md" />
                                <VStack gap={0.5}>
                                    <Text size="sm" weight="bold">{user?.name || 'Administrator'}</Text>
                                    <HStack gap={1.5} align="center">
                                        <Badge variant="neutral" label={user?.role || 'OWNER'} />
                                        <Text size="xsm" color="secondary">@{user?.username || 'admin'}</Text>
                                    </HStack>
                                </VStack>
                            </HStack>
                        </HStack>
                    </Card>

                    {/* Shift Status Quick Action */}
                    <div
                        onClick={() => {
                            setShowMobileMenu(false);
                            smoothNavigate('/cash-management');
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 10,
                            backgroundColor: '#f4f4f5',
                            border: '1px solid #e4e4e7',
                            cursor: 'pointer',
                        }}
                    >
                        <HStack gap={2} align="center">
                            <CircleDot size={16} color={hasActiveShift ? '#16a34a' : '#a1a1aa'} />
                            <VStack gap={0}>
                                <Text size="sm" weight="semibold">Status Kasir</Text>
                                <Text size="xsm" color="secondary">
                                    {hasActiveShift ? 'Sesi kasir aktif' : 'Belum ada sesi shift'}
                                </Text>
                            </VStack>
                        </HStack>
                        <Badge
                            variant={hasActiveShift ? 'success' : 'neutral'}
                            label={hasActiveShift ? 'Shift Aktif' : 'Shift Tutup'}
                        />
                    </div>

                    <Divider />

                    {/* Katalog & Produk */}
                    <VStack gap={2}>
                        <Text size="xsm" weight="bold" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                            Katalog & Produk
                        </Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {[
                                { path: '/products', label: 'Daftar Produk', sub: 'Katalog & SKU', icon: Package, bg: '#f5f3ff', color: '#7c3aed' },
                                { path: '/categories', label: 'Kategori', sub: 'Grup Menu', icon: Tags, bg: '#ecfeff', color: '#0891b2' },
                                { path: '/inventory', label: 'Manajemen Stok', sub: 'Log & Opname', icon: Warehouse, bg: '#fffbeb', color: '#d97706' },
                                { path: '/discounts', label: 'Aturan Diskon', sub: 'Promo & Diskon', icon: Percent, bg: '#fff7ed', color: '#ea580c' },
                                { path: '/vouchers', label: 'Voucher Belanja', sub: 'Kupon Kasir', icon: Ticket, bg: '#f0fdfa', color: '#0d9488' },
                            ].map((m) => {
                                const Icon = m.icon;
                                const isSel = location.pathname === m.path;
                                return (
                                    <div
                                        key={m.path}
                                        onClick={() => {
                                            setShowMobileMenu(false);
                                            smoothNavigate(m.path);
                                        }}
                                        className="pos-menu-tile"
                                        style={{
                                            borderColor: isSel ? '#18181b' : '#e4e4e7',
                                            backgroundColor: isSel ? '#fafafa' : '#ffffff',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                backgroundColor: m.bg,
                                                color: m.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon size={16} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                            <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 600, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.label}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.sub}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </VStack>

                    {/* Operasional & Tim */}
                    <VStack gap={2}>
                        <Text size="xsm" weight="bold" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                            Operasional & Tim
                        </Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            {[
                                { path: '/customers', label: 'Pelanggan CRM', sub: 'Poin & Member', icon: Users, bg: '#eff6ff', color: '#2563eb' },
                                { path: '/cash-management', label: 'Arus Kas', sub: 'Shift & Laci', icon: Wallet, bg: '#ecfdf5', color: '#059669' },
                                { path: '/employees', label: 'Karyawan', sub: 'Staff & Kasir', icon: UserCog, bg: '#eef2ff', color: '#4f46e5' },
                                { path: '/reports', label: 'Laporan Bisnis', sub: 'Omzet & Margin', icon: BarChart3, bg: '#fdf2f8', color: '#db2777' },
                                { path: '/audit-logs', label: 'Audit Log', sub: 'Jejak Aktivitas', icon: ShieldCheck, bg: '#f8fafc', color: '#475569' },
                            ].map((m) => {
                                const Icon = m.icon;
                                const isSel = location.pathname === m.path;
                                return (
                                    <div
                                        key={m.path}
                                        onClick={() => {
                                            setShowMobileMenu(false);
                                            smoothNavigate(m.path);
                                        }}
                                        className="pos-menu-tile"
                                        style={{
                                            borderColor: isSel ? '#18181b' : '#e4e4e7',
                                            backgroundColor: isSel ? '#fafafa' : '#ffffff',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                backgroundColor: m.bg,
                                                color: m.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon size={16} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                            <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 600, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.label}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.sub}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </VStack>

                    <Divider />

                    {/* Account Settings Actions */}
                    <VStack gap={2}>
                        <Button
                            variant="secondary"
                            label="Ganti Password"
                            icon={<KeyRound size={16} />}
                            width="100%"
                            onClick={() => {
                                setShowMobileMenu(false);
                                setShowChangePassword(true);
                            }}
                        />
                        <Button
                            variant="destructive"
                            label="Keluar dari Akun"
                            icon={<LogOut size={16} />}
                            width="100%"
                            onClick={logout}
                        />
                    </VStack>
                </VStack>
            </BottomSheet>

            {/* Change Password Modal */}
            <Modal
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
                title="Ganti Password"
                subtitle={`Akun: ${user?.name || 'Admin'} (${user?.role || 'OWNER'})`}
                width={420}
            >
                <form onSubmit={handleChangePassword}>
                    <VStack gap={4}>
                        <TextInput
                            type="password"
                            label="Password Baru"
                            placeholder="Minimal 6 karakter"
                            value={newPassword}
                            onChange={(v) => setNewPassword(v)}
                            isRequired
                            hasAutoFocus
                        />
                        <TextInput
                            type="password"
                            label="Konfirmasi Password Baru"
                            placeholder="Ulangi password baru"
                            value={confirmPassword}
                            onChange={(v) => setConfirmPassword(v)}
                            isRequired
                        />
                        <HStack justify="end" gap={2}>
                            <Button
                                variant="secondary"
                                label="Batal"
                                onClick={() => setShowChangePassword(false)}
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                label="Simpan Password"
                                isLoading={isSavingPassword}
                            />
                        </HStack>
                    </VStack>
                </form>
            </Modal>

            {/* Quick Navigation Command Modal (Ctrl+K) */}
            <Modal
                isOpen={showQuickJump}
                onClose={() => setShowQuickJump(false)}
                title="Navigasi Cepat"
                subtitle="Pindah halaman instan dengan keyboard atau klik"
                width={480}
            >
                <VStack gap={3}>
                    <TextInput
                        label="Cari halaman"
                        isLabelHidden
                        type="search"
                        placeholder="Ketik nama menu (mis. Kasir, Produk, Laporan)..."
                        value={quickQuery}
                        onChange={(v) => setQuickQuery(v)}
                        startIcon={<Search size={16} />}
                        hasAutoFocus
                        onEnter={() => {
                            if (filteredQuickRoutes.length > 0) {
                                smoothNavigate(filteredQuickRoutes[0].path);
                                setShowQuickJump(false);
                            }
                        }}
                    />
                    <VStack gap={1} style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {filteredQuickRoutes.map((item) => (
                            <div
                                key={item.path}
                                className="pos-row-hover"
                                onClick={() => {
                                    smoothNavigate(item.path);
                                    setShowQuickJump(false);
                                }}
                                style={{
                                    cursor: 'pointer',
                                    padding: '10px 12px',
                                    marginInline: 0,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <VStack gap={0}>
                                    <Text size="sm" weight="semibold">{item.label}</Text>
                                    <Text size="xsm" color="secondary">{item.desc}</Text>
                                </VStack>
                                <ArrowRight size={15} color="#71717a" />
                            </div>
                        ))}
                        {filteredQuickRoutes.length === 0 && (
                            <EmptyState title="Menu tidak ditemukan" isCompact />
                        )}
                    </VStack>
                </VStack>
            </Modal>

            {/* Notifications Drawer */}
            <Drawer
                isOpen={showNotifications}
                onOpenChange={setShowNotifications}
                label="Notifikasi Stok"
                side="end"
                width={360}
                padding={4}
            >
                <VStack gap={4} height="100%">
                    <HStack justify="between" align="center">
                        <Heading level={4} weight="semibold">Notifikasi</Heading>
                        <Badge
                            variant={notifications.length > 0 ? 'warning' : 'neutral'}
                            label={`${notifications.length} Baru`}
                        />
                    </HStack>
                    <Divider />
                    <VStack gap={2} style={{ flex: 1, overflowY: 'auto' }}>
                        {notifications.length > 0 ? (
                            notifications.map((n) => (
                                <Card key={n.id} padding={3} variant="muted" elevation="none">
                                    <HStack gap={3} align="start">
                                        <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <VStack gap={0.5}>
                                            <Text size="sm" weight="semibold">{n.title}</Text>
                                            <Text size="sm" color="secondary">{n.message}</Text>
                                            <Text size="2xs" color="secondary">{n.time}</Text>
                                        </VStack>
                                    </HStack>
                                </Card>
                            ))
                        ) : (
                            <EmptyState
                                title="Tidak ada notifikasi"
                                description="Semua stok produk dalam kondisi aman."
                                isCompact
                            />
                        )}
                    </VStack>
                    {notifications.length > 0 && (
                        <>
                            <Divider />
                            <Button
                                variant="secondary"
                                label="Cek Inventaris"
                                icon={<ArrowRight size={16} />}
                                width="100%"
                                onClick={() => {
                                    setShowNotifications(false);
                                    smoothNavigate('/inventory');
                                }}
                            />
                        </>
                    )}
                </VStack>
            </Drawer>
        </>
    );
};

export default Layout;
