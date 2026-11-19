import { useState, useEffect } from 'react';
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

interface SaleData {
    id: number;
    receiptNumber?: string;
    totalPrice: string;
    finalPrice?: string;
    status?: string;
    date: string;
    customer?: { name: string } | null;
    user?: { name: string } | null;
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
    }, []);

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

    return (
        <VStack gap={5} width="100%">
            {/* Compact Action Bar — no duplicate heading */}
            <HStack justify="between" align="center" wrap="wrap" gap={3}>
                <Text size="sm" color="secondary">{todayFormatted}</Text>
                <HStack gap={2} wrap="wrap">
                    <Button
                        variant="primary"
                        size="sm"
                        label="Buka Kasir"
                        icon={<ShoppingCart size={15} />}
                        onClick={() => navigate('/transactions')}
                    />
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
            </HStack>

            {/* 4 Balanced KPI Cards */}
            <Grid columns={{ minWidth: isNarrow ? 140 : 210, max: 4 }} gap={isNarrow ? 2 : 3}>
                <StatCard
                    title="Total Pendapatan"
                    value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                    subtitle={`Hari ini: Rp ${dashStats.todayRevenue.toLocaleString('id-ID')}`}
                    icon={<Wallet size={17} />}
                    iconBg="#ecfdf5"
                    iconColor="#059669"
                    onClick={() => navigate('/reports')}
                />
                <StatCard
                    title="Total Transaksi"
                    value={totalTransactions}
                    subtitle={`Hari ini: ${dashStats.todayTransactions} trx`}
                    icon={<ReceiptText size={17} />}
                    iconBg="#eff6ff"
                    iconColor="#2563eb"
                    onClick={() => navigate('/transaction-history')}
                />
                <StatCard
                    title="Rata-rata Order"
                    value={`Rp ${Math.round(avgOrderValue).toLocaleString('id-ID')}`}
                    subtitle="Per struk selesai"
                    icon={<TrendingUp size={17} />}
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                    onClick={() => navigate('/reports')}
                />
                <StatCard
                    title="Stok Menipis"
                    value={dashStats.lowStockCount}
                    subtitle={`Dari ${dashStats.totalProducts} produk aktif`}
                    icon={<AlertTriangle size={17} />}
                    iconBg={dashStats.lowStockCount > 0 ? '#fff1f2' : '#f0fdf4'}
                    iconColor={dashStats.lowStockCount > 0 ? '#e11d48' : '#16a34a'}
                    badgeLabel={dashStats.lowStockCount > 0 ? 'Perlu Cek' : 'Aman'}
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
                                    style={{ borderBottom: '1px solid #f4f4f5', cursor: 'pointer' }}
                                >
                                    <VStack gap={0} style={{ minWidth: 0 }}>
                                        <Text size="sm" weight="semibold" maxLines={1}>
                                            {s.receiptNumber || `TRX-${s.id}`}
                                        </Text>
                                        <Text size="xsm" color="secondary" maxLines={1}>
                                            {s.customer?.name || 'Pelanggan Umum'} ·{' '}
                                            {new Date(s.date).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </VStack>
                                    <VStack align="end" gap={0.5} style={{ flexShrink: 0 }}>
                                        <Text size="sm" weight="bold" hasTabularNumbers>
                                            Rp {Number(s.finalPrice || s.totalPrice || 0).toLocaleString('id-ID')}
                                        </Text>
                                        <Badge
                                            variant={s.status === 'VOIDED' ? 'error' : s.status === 'REFUNDED' ? 'warning' : 'success'}
                                            label={s.status === 'VOIDED' ? 'Void' : s.status === 'REFUNDED' ? 'Refund' : 'Selesai'}
                                        />
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
                                <Heading level={4} weight="semibold">Produk Terlaris</Heading>
                                <Text size="xsm" color="secondary">30 hari terakhir</Text>
                            </VStack>
                            <Button variant="ghost" size="sm" label="Detail" onClick={() => navigate('/reports')} />
                        </HStack>
                        <Divider />
                        {topProducts.length > 0 ? (
                            <VStack gap={2}>
                                {topProducts.map((item, idx) => (
                                    <HStack
                                        key={item.product?.id ?? idx}
                                        justify="between"
                                        align="center"
                                        paddingBlock={1.5}
                                        style={{ borderBottom: '1px solid #f4f4f5' }}
                                    >
                                        <HStack gap={2} align="center">
                                            <Badge variant="neutral" label={`#${idx + 1}`} />
                                            <VStack gap={0}>
                                                <Text size="sm" weight="medium">{item.product?.name || 'Produk'}</Text>
                                                <Text size="xsm" color="secondary">{item.totalQuantity} terjual</Text>
                                            </VStack>
                                        </HStack>
                                        <Text size="sm" weight="semibold" hasTabularNumbers>
                                            Rp {Number(item.totalRevenue || 0).toLocaleString('id-ID')}
                                        </Text>
                                    </HStack>
                                ))}
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
