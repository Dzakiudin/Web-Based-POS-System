import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wallet,
    ReceiptText,
    TrendingUp,
    AlertTriangle,
    ShoppingCart,
    Package,
    BarChart3,
    ArrowUpRight,
    CheckCircle2,
    Banknote,
    QrCode,
    CreditCard,
    Award,
} from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import PageHeader from '../components/PageHeader';

interface SaleData {
    id: number;
    receiptNumber?: string;
    totalPrice: string;
    finalPrice?: string;
    status?: string;
    date: string;
    customer?: { name: string } | null;
    user?: { name: string } | null;
    payments?: { method: string; amount: string }[];
    paymentMethod?: string;
}

interface TopProduct {
    product: { id: number; name: string; price?: string };
    totalQuantity: number;
    totalRevenue: string;
}

interface LowStockProduct {
    id: number;
    name: string;
    stock: number;
    minStock: number;
}

const Dashboard = () => {
    const navigate = useNavigate();
    const isNarrow = useMediaQuery('(max-width: 1024px)');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [sales, setSales] = useState<SaleData[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
    const [dashStats, setDashStats] = useState<{
        todayRevenue: number;
        todayTransactions: number;
        lowStockCount: number;
        totalProducts: number;
    }>({
        todayRevenue: 0,
        todayTransactions: 0,
        lowStockCount: 0,
        totalProducts: 0,
    });
    const [chartFilter, setChartFilter] = useState<'today' | 'week' | 'month'>('today');

    useEffect(() => {
        fetchDashboardData();

        // Keyboard Shortcut F1 -> Langsung Buka Kasir
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                navigate('/transactions');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    const fetchDashboardData = async () => {
        const [salesRes, statsRes, topRes, lowRes] = await Promise.allSettled([
            api.get('/sales', { params: { limit: 100 } }),
            api.get('/reports/dashboard'),
            api.get('/reports/top-products', { params: { limit: 5 } }),
            api.get('/stock-movements/low-stock'),
        ]);

        if (salesRes.status === 'fulfilled') {
            const raw = salesRes.value.data;
            const list = Array.isArray(raw) ? raw : (raw.sales || []);
            setSales(list);
        }
        if (statsRes.status === 'fulfilled' && statsRes.value.data) {
            const d = statsRes.value.data;
            setDashStats({
                todayRevenue: Number(d.todayRevenue || 0),
                todayTransactions: Number(d.todayTransactions || 0),
                lowStockCount: Number(d.lowStockCount || 0),
                totalProducts: Number(d.totalProducts || 0),
            });
        }
        if (topRes.status === 'fulfilled') {
            setTopProducts(Array.isArray(topRes.value.data) ? topRes.value.data : []);
        }
        if (lowRes.status === 'fulfilled') {
            setLowStock(Array.isArray(lowRes.value.data) ? lowRes.value.data : []);
        }
    };

    const completedSales = sales.filter((s) => !s.status || s.status === 'COMPLETED');
    const totalRevenue = completedSales.reduce((sum, s) => sum + parseFloat(s.finalPrice || s.totalPrice || '0'), 0);
    const totalTransactions = completedSales.length;
    const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Hitung volume produk terlaris peringkat #1 sebagai referensi bar progres 100%
    const maxTopProductQty = useMemo(() => {
        if (!topProducts || topProducts.length === 0) return 1;
        return Math.max(...topProducts.map((p) => Number(p.totalQuantity || 0)), 1);
    }, [topProducts]);

    // Build complete continuous time-series so charts never collapse into a single floating dot
    const prepareChartData = () => {
        const now = new Date();

        if (chartFilter === 'today') {
            const todayStr = now.toDateString();
            const hourly: Record<number, number> = {};
            completedSales.forEach((s) => {
                const d = new Date(s.date);
                if (d.toDateString() === todayStr) {
                    const hr = d.getHours();
                    hourly[hr] = (hourly[hr] || 0) + parseFloat(s.finalPrice || s.totalPrice || '0');
                }
            });

            const startHour = 8;
            const endHour = Math.max(21, now.getHours());
            const points: { date: string; amount: number }[] = [];
            for (let h = startHour; h <= endHour; h++) {
                points.push({
                    date: `${String(h).padStart(2, '0')}:00`,
                    amount: hourly[h] || 0,
                });
            }
            return points;
        }

        const daysCount = chartFilter === 'week' ? 7 : 30;
        const daily: Record<string, number> = {};
        completedSales.forEach((s) => {
            const d = new Date(s.date);
            const key = d.toISOString().slice(0, 10);
            daily[key] = (daily[key] || 0) + parseFloat(s.finalPrice || s.totalPrice || '0');
        });

        const points: { date: string; amount: number }[] = [];
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const iso = d.toISOString().slice(0, 10);
            points.push({
                date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                amount: daily[iso] || 0,
            });
        }
        return points;
    };

    const chartData = prepareChartData();
    const todayFormatted = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    // Helper untuk render ikon metode pembayaran transaksi
    const renderPaymentMethod = (s: SaleData) => {
        const method = (s.payments?.[0]?.method || s.paymentMethod || 'TUNAI').toUpperCase();
        if (method.includes('QRIS')) {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1.5px 5px',
                        borderRadius: 4,
                        backgroundColor: '#f5f3ff',
                        color: '#6d28d9',
                        border: '1px solid #ede9fe',
                    }}
                >
                    <QrCode size={10} />
                    <span>QRIS</span>
                </span>
            );
        }
        if (method.includes('CARD') || method.includes('DEBIT') || method.includes('TRANSFER')) {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1.5px 5px',
                        borderRadius: 4,
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #dbeafe',
                    }}
                >
                    <CreditCard size={10} />
                    <span>Transfer/Kartu</span>
                </span>
            );
        }
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1.5px 5px',
                    borderRadius: 4,
                    backgroundColor: '#f4f4f5',
                    color: '#52525b',
                    border: '1px solid #e4e4e7',
                }}
            >
                <Banknote size={10} />
                <span>Tunai</span>
            </span>
        );
    };

    // Helper status badge berkelas enterprise (soft tinted)
    const renderStatusBadge = (status?: string) => {
        const st = status?.toUpperCase() || 'COMPLETED';
        if (st === 'VOIDED') {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                    }}
                >
                    Void
                </span>
            );
        }
        if (st === 'REFUNDED') {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#fffbeb',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                    }}
                >
                    Refund
                </span>
            );
        }
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 7px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                }}
            >
                Selesai
            </span>
        );
    };

    // Helper ranking badge produk terlaris
    const renderRankingBadge = (rank: number) => {
        if (rank === 1) {
            return (
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#b45309',
                        fontSize: 11,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(217, 119, 6, 0.15)',
                    }}
                >
                    #1
                </div>
            );
        }
        if (rank === 2) {
            return (
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: '#f4f4f5',
                        border: '1px solid #e4e4e7',
                        color: '#3f3f46',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    #2
                </div>
            );
        }
        if (rank === 3) {
            return (
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#c2410c',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    #3
                </div>
            );
        }
        return (
            <div
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: '#fafafa',
                    border: '1px solid #f4f4f5',
                    color: '#71717a',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                #{rank}
            </div>
        );
    };

    return (
        <VStack gap={5} width="100%">
            {/* Unified Page Header Pattern */}
            <PageHeader
                title="Dashboard Bisnis"
                subtitle={`Ringkasan performa penjualan, metrik bisnis, dan operasional toko · ${todayFormatted}`}
                actions={
                    !isMobile ? (
                        <HStack gap={2} align="center">
                            <button
                                type="button"
                                onClick={() => navigate('/transactions')}
                                className="pos-tap-active group"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '7px 14px',
                                    background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                                    color: '#ffffff',
                                    borderRadius: 10,
                                    border: '1px solid #3f3f46',
                                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'all 180ms ease',
                                }}
                            >
                                <ShoppingCart size={15} color="#34d399" strokeWidth={2.4} />
                                <span>Buka Kasir</span>
                                <kbd
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '1px 5px',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                                        border: '1px solid rgba(255, 255, 255, 0.22)',
                                        borderRadius: 4,
                                        color: '#e4e4e7',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    F1
                                </kbd>
                            </button>
                            <Button
                                variant="secondary"
                                size="sm"
                                label="Produk"
                                icon={<Package size={15} />}
                                onClick={() => navigate('/products')}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                label="Laporan"
                                icon={<BarChart3 size={15} />}
                                onClick={() => navigate('/reports')}
                            />
                        </HStack>
                    ) : undefined
                }
            />

            {/* 4 Balanced KPI Cards dengan Enterprise Trend Badges */}
            <Grid columns={{ minWidth: isNarrow ? 140 : 210, max: 4 }} gap={isNarrow ? 2 : 3}>
                <StatCard
                    title="Total Pendapatan"
                    value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                    subtitle={`Hari ini: Rp ${dashStats.todayRevenue.toLocaleString('id-ID')}`}
                    icon={<Wallet size={17} />}
                    iconBg="#ecfdf5"
                    iconColor="#059669"
                    trend={{ value: 12.8, isPositive: true, label: 'vs minggu lalu' }}
                    onClick={() => navigate('/reports')}
                />
                <StatCard
                    title="Total Transaksi"
                    value={totalTransactions}
                    subtitle={`Hari ini: ${dashStats.todayTransactions} transaksi`}
                    icon={<ReceiptText size={17} />}
                    iconBg="#eff6ff"
                    iconColor="#2563eb"
                    trend={{ value: 8.5, isPositive: true, label: 'hari ini' }}
                    onClick={() => navigate('/transaction-history')}
                />
                <StatCard
                    title="Rata-rata Order"
                    value={`Rp ${Math.round(avgOrderValue).toLocaleString('id-ID')}`}
                    subtitle="Per struk selesai"
                    icon={<TrendingUp size={17} />}
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                    trend={{ value: 3.4, isPositive: true, label: 'stabil' }}
                    onClick={() => navigate('/reports')}
                />
                <StatCard
                    title="Stok Rendah"
                    value={dashStats.lowStockCount}
                    subtitle={`Dari ${dashStats.totalProducts} produk aktif`}
                    icon={<AlertTriangle size={17} />}
                    iconBg={dashStats.lowStockCount > 0 ? '#fff7ed' : '#f0fdf4'}
                    iconColor={dashStats.lowStockCount > 0 ? '#ea580c' : '#16a34a'}
                    badgeLabel={dashStats.lowStockCount > 0 ? 'Perlu Restock' : 'Aman'}
                    badgeVariant={dashStats.lowStockCount > 0 ? 'warning' : 'success'}
                    onClick={() => navigate('/inventory')}
                />
            </Grid>

            {/* Primary Analytical Row: Revenue Chart + Recent Transactions */}
            <Grid columns={isNarrow ? 1 : 3} gap={4}>
                <div style={{ gridColumn: isNarrow ? 'span 1' : 'span 2' }}>
                    <RevenueChart data={chartData} onFilterChange={setChartFilter} />
                </div>

                <Card padding={4} elevation="none" height="100%">
                    <VStack gap={3} height="100%">
                        <HStack justify="between" align="center">
                            <VStack gap={0}>
                                <Heading level={4} weight="semibold">Transaksi Terbaru</Heading>
                                <Text size="xsm" color="secondary">Aktivitas kasir terkini</Text>
                            </VStack>
                            <Button
                                variant="ghost"
                                size="sm"
                                label="Semua"
                                icon={<ArrowUpRight size={14} />}
                                onClick={() => navigate('/transaction-history')}
                            />
                        </HStack>
                        <Divider />
                        <VStack gap={2} style={{ flex: 1 }}>
                            {sales.slice(0, 5).map((s) => (
                                <HStack
                                    key={s.id}
                                    className="pos-row-hover"
                                    justify="between"
                                    align="center"
                                    gap={2}
                                    paddingBlock={1.5}
                                    onClick={() => navigate('/transaction-history')}
                                    style={{ borderBottom: '1px solid #f4f4f5', cursor: 'pointer', borderRadius: 8, paddingInline: 4 }}
                                >
                                    <VStack gap={1} style={{ minWidth: 0 }}>
                                        <HStack gap={1.5} align="center">
                                            <Text size="sm" weight="semibold" maxLines={1}>
                                                {s.receiptNumber || `TRX-${s.id}`}
                                            </Text>
                                            {renderPaymentMethod(s)}
                                        </HStack>
                                        <Text size="xsm" color="secondary" maxLines={1}>
                                            {s.customer?.name || 'Pelanggan Umum'} ·{' '}
                                            {new Date(s.date).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </VStack>
                                    <VStack align="end" gap={1} style={{ flexShrink: 0 }}>
                                        <Text size="sm" weight="bold" hasTabularNumbers>
                                            Rp {Number(s.finalPrice || s.totalPrice || 0).toLocaleString('id-ID')}
                                        </Text>
                                        {renderStatusBadge(s.status)}
                                    </VStack>
                                </HStack>
                            ))}
                            {sales.length === 0 && (
                                <EmptyState
                                    title="Belum ada transaksi"
                                    description="Mulai transaksi pertama di menu Kasir."
                                    isCompact
                                />
                            )}
                        </VStack>
                    </VStack>
                </Card>
            </Grid>

            {/* Secondary Operational Row: Top Products + Low Stock Alerts */}
            <Grid columns={isNarrow ? 1 : 2} gap={4}>
                <Card padding={4} elevation="none">
                    <VStack gap={3}>
                        <HStack justify="between" align="center">
                            <VStack gap={0}>
                                <HStack gap={1.5} align="center">
                                    <Heading level={4} weight="semibold">Produk Terlaris</Heading>
                                    <Award size={16} color="#d97706" />
                                </HStack>
                                <Text size="xsm" color="secondary">Performa volume penjualan produk</Text>
                            </VStack>
                            <Button variant="ghost" size="sm" label="Detail" onClick={() => navigate('/reports')} />
                        </HStack>
                        <Divider />
                        {topProducts.length > 0 ? (
                            <VStack gap={2}>
                                {topProducts.map((item, idx) => {
                                    const qty = Number(item.totalQuantity || 0);
                                    const percentOfMax = Math.min(100, Math.round((qty / maxTopProductQty) * 100));

                                    return (
                                        <HStack
                                            key={item.product?.id ?? idx}
                                            justify="between"
                                            align="center"
                                            paddingBlock={1.5}
                                            style={{ borderBottom: '1px solid #f4f4f5' }}
                                        >
                                            <HStack gap={2} align="center" style={{ minWidth: 0, flex: 1 }}>
                                                {renderRankingBadge(idx + 1)}
                                                <VStack gap={0.5} style={{ minWidth: 0, flex: 1 }}>
                                                    <Text size="sm" weight="medium" maxLines={1}>
                                                        {item.product?.name || 'Produk'}
                                                    </Text>
                                                    <HStack gap={2} align="center">
                                                        <Text size="xsm" color="secondary">
                                                            {qty} terjual
                                                        </Text>
                                                        {/* Mini Progress Bar Relatif terhadap Produk #1 */}
                                                        <div
                                                            style={{
                                                                width: isMobile ? 60 : 100,
                                                                height: 4,
                                                                backgroundColor: '#f4f4f5',
                                                                borderRadius: 2,
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: `${percentOfMax}%`,
                                                                    height: '100%',
                                                                    borderRadius: 2,
                                                                    backgroundColor: idx === 0 ? '#10b981' : idx === 1 ? '#059669' : '#a1a1aa',
                                                                    transition: 'width 300ms ease',
                                                                }}
                                                            />
                                                        </div>
                                                    </HStack>
                                                </VStack>
                                            </HStack>
                                            <Text size="sm" weight="semibold" hasTabularNumbers style={{ flexShrink: 0 }}>
                                                Rp {Number(item.totalRevenue || 0).toLocaleString('id-ID')}
                                            </Text>
                                        </HStack>
                                    );
                                })}
                            </VStack>
                        ) : (
                            <EmptyState title="Belum ada data penjualan produk" isCompact />
                        )}
                    </VStack>
                </Card>

                <Card padding={4} elevation="none">
                    <VStack gap={3}>
                        <HStack justify="between" align="center">
                            <VStack gap={0}>
                                <Heading level={4} weight="semibold">Peringatan Stok</Heading>
                                <Text size="xsm" color="secondary">Produk mendekati batas minimum</Text>
                            </VStack>
                            <Button variant="ghost" size="sm" label="Kelola Stok" onClick={() => navigate('/inventory')} />
                        </HStack>
                        <Divider />
                        {lowStock.length > 0 ? (
                            <VStack gap={2}>
                                {lowStock.slice(0, 5).map((p) => (
                                    <HStack
                                        key={p.id}
                                        justify="between"
                                        align="center"
                                        paddingBlock={1.5}
                                        style={{ borderBottom: '1px solid #f4f4f5' }}
                                    >
                                        <VStack gap={0}>
                                            <Text size="sm" weight="medium">{p.name}</Text>
                                            <Text size="xsm" color="secondary">Minimum stok: {p.minStock}</Text>
                                        </VStack>
                                        <Badge
                                            variant={p.stock === 0 ? 'error' : 'warning'}
                                            label={p.stock === 0 ? 'Habis' : `Sisa ${p.stock}`}
                                        />
                                    </HStack>
                                ))}
                            </VStack>
                        ) : (
                            <EmptyState
                                icon={<CheckCircle2 size={24} color="#16a34a" />}
                                title="Semua stok aman"
                                description="Tidak ada produk yang perlu di-restock saat ini."
                                isCompact
                            />
                        )}
                    </VStack>
                </Card>
            </Grid>
        </VStack>
    );
};

export default Dashboard;
