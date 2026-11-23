import { useState, useEffect, useMemo } from 'react';
import { Wallet, ReceiptText, Users, AlertTriangle, Download, Flame, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import StatCard from '../components/StatCard';
import { downloadOrShareFile } from '../lib/fileHelper';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface DashboardStats {
    todayRevenue?: number;
    todayTransactions?: number;
    totalCustomers?: number;
    totalProducts?: number;
    lowStockCount?: number;
}

interface TopProduct {
    product: { name: string; id: number };
    totalQuantity: number;
    totalRevenue: string;
}

interface SaleReport {
    date: string;
    revenue: number;
    transactions: number;
    profit: number;
}

interface PeakHour {
    hour: number;
    label: string;
    count: number;
    revenue: number;
}

type ExportReportType = 'sales' | 'top-products' | 'peak-hours';

const escapeCsv = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
};

const csvLine = (cols: (string | number | undefined | null)[]) => cols.map(escapeCsv).join(',');

const CustomRevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload as SaleReport;
        const rev = Number(item.revenue || 0);
        const profit = Number(item.profit || 0);
        const trx = item.transactions || 0;
        const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';

        let formattedDate = label;
        try {
            formattedDate = new Date(label).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {}

        return (
            <div
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #e4e4e7',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                    padding: '10px 14px',
                    minWidth: 185,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'inline-block',
                            boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                        }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#71717a' }}>{formattedDate}</span>
                </div>
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#09090b',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.025em',
                    }}
                >
                    Rp {rev.toLocaleString('id-ID')}
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: '1px solid #f4f4f5',
                        fontSize: 11,
                    }}
                >
                    <span style={{ color: '#71717a' }}>Gross Profit:</span>
                    <span style={{ fontWeight: 600, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                        Rp {profit.toLocaleString('id-ID')}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 3, fontSize: 11 }}>
                    <span style={{ color: '#71717a' }}>Margin / Trx:</span>
                    <span style={{ fontWeight: 600, color: '#3f3f46', fontVariantNumeric: 'tabular-nums' }}>
                        {margin}% ({trx} trx)
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

const CustomPeakHourTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload as (PeakHour & { isPeak?: boolean });
        return (
            <div
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #e4e4e7',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                    padding: '10px 14px',
                    minWidth: 165,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#09090b' }}>Pukul {item.label}</span>
                    {item.isPeak && (
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#047857',
                                backgroundColor: '#d1fae5',
                                padding: '1px 6px',
                                borderRadius: 4,
                            }}
                        >
                            Jam Puncak
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.isPeak ? '#059669' : '#18181b', fontVariantNumeric: 'tabular-nums' }}>
                    {item.count} Transaksi
                </div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                    Omset: Rp {Number(item.revenue || 0).toLocaleString('id-ID')}
                </div>
            </div>
        );
    }
    return null;
};

const Reports = () => {
    const toast = useToast();
    const { settings } = useStoreSettings();
    const isNarrow = useMediaQuery('(max-width: 1024px)');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [stats, setStats] = useState<DashboardStats>({});
    const [sales, setSales] = useState<SaleReport[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
    const [exportType, setExportType] = useState<ExportReportType>('sales');

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        Promise.all([
            api.get('/reports/dashboard').then((r) => setStats(r.data || {})),
            api.get('/reports/top-products').then((r) => setTopProducts(Array.isArray(r.data) ? r.data : [])),
            api.get('/reports/peak-hours').then((r) => setPeakHours(Array.isArray(r.data) ? r.data : [])),
        ]).catch((e: any) => {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat ringkasan laporan');
        });
    }, []);

    useEffect(() => {
        api.get('/reports/sales', { params: { startDate, endDate } })
            .then((r) => {
                setSales(Array.isArray(r.data?.chartData) ? r.data.chartData : []);
                setSummary(r.data?.summary || {});
            })
            .catch((e: any) => {
                toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat laporan penjualan periodik');
            });
    }, [startDate, endDate]);

    const totalRev = Number(summary.totalRevenue || 0);
    const grossProfit = Number(summary.grossProfit || 0);
    const margin = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : '0.0';

    // Cari jam dengan frekuensi transaksi tertinggi untuk aksen visual Peak Hour
    const peakHourInfo = useMemo(() => {
        if (!peakHours.length) return null;
        let max = peakHours[0];
        for (const h of peakHours) {
            if (h.count > max.count) {
                max = h;
            }
        }
        return max.count > 0 ? max : null;
    }, [peakHours]);

    // Data peak hours yang disuntik dengan flag isPeak untuk tooltip & Cell styling
    const peakHoursWithHighlight = useMemo(() => {
        return peakHours.map((h) => ({
            ...h,
            isPeak: Boolean(peakHourInfo && h.hour === peakHourInfo.hour && h.count > 0),
        }));
    }, [peakHours, peakHourInfo]);

    const exportOptions = [
        { value: 'sales', label: 'Laporan Penjualan Harian' },
        { value: 'top-products', label: 'Performa Produk Terlaris' },
        { value: 'peak-hours', label: 'Analisis Jam Sibuk (Peak Hours)' },
    ];

    const isExportDisabled = useMemo(() => {
        if (exportType === 'sales') return sales.length === 0;
        if (exportType === 'top-products') return topProducts.length === 0;
        if (exportType === 'peak-hours') return peakHours.length === 0;
        return false;
    }, [exportType, sales, topProducts, peakHours]);

    const handleExportCSV = async () => {
        const now = new Date();
        const printDate = `${now.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

        if (exportType === 'sales') {
            if (!sales.length) return;
            const totalTrx = sales.reduce((sum, s) => sum + (s.transactions || 0), 0);
            const avgMargin = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : '0.0';

            const lines: string[] = [
                csvLine([`LAPORAN PENJUALAN BISNIS - ${settings.appName.toUpperCase()}`]),
                csvLine([`Periode: ${startDate} s/d ${endDate}`]),
                csvLine([`Dicetak pada: ${printDate}`]),
                '', // Baris kosong pemisah
                csvLine(['Tanggal', 'Jumlah Transaksi', 'Total Revenue (Rp)', 'Gross Profit (Rp)', 'Margin (%)']),
                ...sales.map((s) => {
                    const dayRev = Number(s.revenue || 0);
                    const dayProfit = Number(s.profit || 0);
                    const dayMargin = dayRev > 0 ? ((dayProfit / dayRev) * 100).toFixed(1) + '%' : '0.0%';
                    return csvLine([
                        s.date,
                        s.transactions,
                        dayRev,
                        dayProfit,
                        dayMargin,
                    ]);
                }),
                csvLine(['TOTAL KESELURUHAN', totalTrx, totalRev, grossProfit, `${avgMargin}%`]),
            ];

            const csvContent = '\uFEFF' + lines.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            await downloadOrShareFile(blob, `laporan-penjualan-harian-${startDate}-sd-${endDate}.csv`, 'text/csv');
        } else if (exportType === 'top-products') {
            if (!topProducts.length) return;
            const totalQty = topProducts.reduce((sum, p) => sum + Number(p.totalQuantity || 0), 0);
            const totalOmset = topProducts.reduce((sum, p) => sum + Number(p.totalRevenue || 0), 0);

            const lines: string[] = [
                csvLine([`LAPORAN PERFORMA PRODUK TERLARIS - ${settings.appName.toUpperCase()}`]),
                csvLine([`Periode: ${startDate} s/d ${endDate}`]),
                csvLine([`Dicetak pada: ${printDate}`]),
                '', // Baris kosong pemisah
                csvLine(['Peringkat', 'Nama Produk', 'Qty Terjual', 'Total Omset (Rp)']),
                ...topProducts.map((p, idx) => {
                    return csvLine([
                        idx + 1,
                        p.product?.name || 'Unknown',
                        p.totalQuantity || 0,
                        Number(p.totalRevenue || 0),
                    ]);
                }),
                csvLine(['TOTAL KESELURUHAN', '-', totalQty, totalOmset]),
            ];

            const csvContent = '\uFEFF' + lines.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            await downloadOrShareFile(blob, `laporan-produk-terlaris-${startDate}-sd-${endDate}.csv`, 'text/csv');
        } else if (exportType === 'peak-hours') {
            if (!peakHours.length) return;
            const totalTrx = peakHours.reduce((sum, h) => sum + Number(h.count || 0), 0);
            const totalOmset = peakHours.reduce((sum, h) => sum + Number(h.revenue || 0), 0);

            const lines: string[] = [
                csvLine([`LAPORAN ANALISIS JAM SIBUK / PEAK HOURS - ${settings.appName.toUpperCase()}`]),
                csvLine([`Periode: Data Distribusi 24 Jam (${startDate} s/d ${endDate})`]),
                csvLine([`Dicetak pada: ${printDate}`]),
                '', // Baris kosong pemisah
                csvLine(['Jam', 'Jumlah Transaksi', 'Total Omset (Rp)']),
                ...peakHours.map((h) => {
                    return csvLine([
                        h.label,
                        h.count || 0,
                        Number(h.revenue || 0),
                    ]);
                }),
                csvLine(['TOTAL KESELURUHAN', totalTrx, totalOmset]),
            ];

            const csvContent = '\uFEFF' + lines.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            await downloadOrShareFile(blob, `laporan-jam-sibuk-${startDate}-sd-${endDate}.csv`, 'text/csv');
        }
    };

    return (
        <VStack gap={4} width="100%">
            {/* Unified Page Header Pattern */}
            <PageHeader
                title="Laporan Bisnis & Analitik"
                subtitle="Analisis performa penjualan, margin laba kotor, jam sibuk, dan ekspor data"
            />

            {/* KPI Row */}
            <Grid columns={isMobile ? 2 : { minWidth: 200, max: 4 }} gap={isMobile ? 2 : 3}>
                <StatCard
                    title="Pendapatan Hari Ini"
                    value={`Rp ${Number(stats.todayRevenue || 0).toLocaleString('id-ID')}`}
                    icon={<Wallet size={18} />}
                    iconBg="rgba(16, 185, 129, 0.12)"
                    iconColor="#059669"
                />
                <StatCard
                    title="Transaksi Hari Ini"
                    value={stats.todayTransactions || 0}
                    icon={<ReceiptText size={18} />}
                    iconBg="rgba(59, 130, 246, 0.12)"
                    iconColor="#2563eb"
                />
                <StatCard
                    title="Total Pelanggan"
                    value={stats.totalCustomers || 0}
                    icon={<Users size={18} />}
                    iconBg="rgba(139, 92, 246, 0.12)"
                    iconColor="#7c3aed"
                />
                <StatCard
                    title="Stok Rendah"
                    value={stats.lowStockCount || 0}
                    icon={<AlertTriangle size={18} />}
                    iconBg={Number(stats.lowStockCount || 0) > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(244, 244, 245, 1)'}
                    iconColor={Number(stats.lowStockCount || 0) > 0 ? '#dc2626' : '#71717a'}
                />
            </Grid>

            {/* Charts Row */}
            <Grid columns={isNarrow ? 1 : 2} gap={4}>
                {/* Smooth AreaChart Grafik Pendapatan */}
                <Card padding={isMobile ? 3 : 4} elevation="none">
                    <VStack gap={3}>
                        <VStack gap={0.5}>
                            <HStack justify="between" align="center">
                                <Heading level={4} weight="semibold">Grafik Pendapatan</Heading>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '2px 8px',
                                        borderRadius: 9999,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                        color: '#047857',
                                        border: '1px solid rgba(16, 185, 129, 0.28)',
                                    }}
                                >
                                    <TrendingUp size={12} strokeWidth={2.5} />
                                    <span>Harian</span>
                                </div>
                            </HStack>
                            <Text size="xsm" color="secondary">Tren pendapatan harian dan margin periode terpilih</Text>
                        </VStack>
                        <div style={{ width: '100%', height: 260 }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={sales} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                                            <stop offset="60%" stopColor="#059669" stopOpacity={0.06} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.00} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#71717a', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                        minTickGap={20}
                                        tickFormatter={(dateStr) => {
                                            try {
                                                const d = new Date(dateStr);
                                                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                            } catch {
                                                return dateStr;
                                            }
                                        }}
                                    />
                                    <YAxis
                                        tick={{ fill: '#71717a', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={48}
                                        tickFormatter={(val) => {
                                            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                                            if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                                            return val;
                                        }}
                                    />
                                    <Tooltip
                                        content={<CustomRevenueTooltip />}
                                        cursor={{ stroke: '#059669', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#059669"
                                        strokeWidth={2.5}
                                        fill="url(#reportRevenueGradient)"
                                        dot={false}
                                        activeDot={{
                                            r: 5,
                                            fill: '#059669',
                                            stroke: '#ffffff',
                                            strokeWidth: 2.5,
                                        }}
                                        animationDuration={600}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </VStack>
                </Card>

                {/* Jam Ramai (Peak Hours) dengan Visual Highlight */}
                <Card padding={isMobile ? 3 : 4} elevation="none">
                    <VStack gap={3}>
                        <HStack justify="between" align="center" wrap="wrap" gap={1}>
                            <VStack gap={0.5}>
                                <Heading level={4} weight="semibold">Jam Ramai (Peak Hours)</Heading>
                                <Text size="xsm" color="secondary">Distribusi jumlah transaksi per jam</Text>
                            </VStack>
                            {peakHourInfo && (
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '2px 8px',
                                        borderRadius: 9999,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                        color: '#047857',
                                        border: '1px solid rgba(16, 185, 129, 0.28)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    <Flame size={12} color="#059669" />
                                    <span>Puncak: {peakHourInfo.label} ({peakHourInfo.count} Trx)</span>
                                </div>
                            )}
                        </HStack>
                        <div style={{ width: '100%', height: 260 }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={peakHoursWithHighlight} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fill: '#71717a', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval={isMobile ? 3 : 1}
                                    />
                                    <YAxis
                                        tick={{ fill: '#71717a', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={36}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        content={<CustomPeakHourTooltip />}
                                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {peakHoursWithHighlight.map((entry, index) => {
                                            return (
                                                <Cell
                                                    key={`peak-cell-${index}`}
                                                    fill={entry.isPeak ? '#059669' : '#cbd5e1'}
                                                    opacity={entry.isPeak ? 1 : 0.8}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </VStack>
                </Card>
            </Grid>

            {/* Top Products */}
            <Card padding={isMobile ? 3 : 4} elevation="none">
                <VStack gap={3}>
                    <Heading level={4} weight="semibold">Produk Terlaris</Heading>
                    {isNarrow ? (
                        topProducts.length > 0 ? (
                            <VStack gap={2}>
                                {topProducts.map((p, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            border: '1px solid #e4e4e7',
                                            backgroundColor: '#ffffff',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <HStack gap={2} align="center">
                                            <div
                                                style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: 8,
                                                    backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f4f4f5' : i === 2 ? '#ffedd5' : '#fafafa',
                                                    color: i === 0 ? '#b45309' : i === 1 ? '#52525b' : i === 2 ? '#c2410c' : '#71717a',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '1px solid #e4e4e7',
                                                }}
                                            >
                                                {i + 1}
                                            </div>
                                            <VStack gap={0}>
                                                <Text size="sm" weight="semibold">{p.product?.name || 'Unknown'}</Text>
                                                <Text size="xsm" color="secondary">{p.totalQuantity} terjual</Text>
                                            </VStack>
                                        </HStack>
                                        <Text size="sm" weight="bold" hasTabularNumbers>
                                            Rp {Number(p.totalRevenue || 0).toLocaleString('id-ID')}
                                        </Text>
                                    </div>
                                ))}
                            </VStack>
                        ) : (
                            <EmptyState title="Belum ada data produk terlaris" isCompact />
                        )
                    ) : (
                        <ScrollableArea label="Tabel data">
                            {topProducts.length > 0 ? (
                                <Table density="balanced" dividers="rows" hasHover>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHeaderCell>#</TableHeaderCell>
                                            <TableHeaderCell>Produk</TableHeaderCell>
                                            <TableHeaderCell>Terjual</TableHeaderCell>
                                            <TableHeaderCell>Pendapatan</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topProducts.map((p, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: 6,
                                                            backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f4f4f5' : i === 2 ? '#ffedd5' : '#fafafa',
                                                            color: i === 0 ? '#b45309' : i === 1 ? '#52525b' : i === 2 ? '#c2410c' : '#71717a',
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '1px solid #e4e4e7',
                                                        }}
                                                    >
                                                        {i + 1}
                                                    </div>
                                                </TableCell>
                                                <TableCell><Text size="sm" weight="medium">{p.product?.name || 'Unknown'}</Text></TableCell>
                                                <TableCell><Text size="sm" hasTabularNumbers>{p.totalQuantity}</Text></TableCell>
                                                <TableCell><Text size="sm" weight="semibold" hasTabularNumbers>Rp {Number(p.totalRevenue || 0).toLocaleString('id-ID')}</Text></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <EmptyState title="Belum ada data produk terlaris" isCompact />
                            )}
                        </ScrollableArea>
                    )}
                </VStack>
            </Card>

            {/* Detailed Sales Report */}
            <Card padding={isMobile ? 3 : 4} elevation="none">
                <VStack gap={4}>
                    {/* Header + Toolbar Filter & Opsi Ekspor CSV */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 16,
                            width: '100%',
                            flexWrap: 'wrap',
                        }}
                    >
                        <VStack gap={0.5} style={{ minWidth: 240, flex: '1 1 auto' }}>
                            <Heading level={4} weight="semibold">Laporan Penjualan Periodik</Heading>
                            <Text size="xsm" color="secondary">Ringkasan omzet, laba kotor, dan margin laba per tanggal</Text>
                        </VStack>

                        <div className="pos-report-filter-bar">
                            <div className="pos-report-filter-item">
                                <DateInput
                                    label="Dari"
                                    value={startDate as any}
                                    onChange={(v) => v && setStartDate(v)}
                                    size="sm"
                                    format="date"
                                    width="100%"
                                />
                            </div>
                            <div className="pos-report-filter-item">
                                <DateInput
                                    label="Sampai"
                                    value={endDate as any}
                                    onChange={(v) => v && setEndDate(v)}
                                    size="sm"
                                    format="date"
                                    width="100%"
                                />
                            </div>
                            <div className="pos-report-filter-selector">
                                <Selector
                                    label="Opsi Laporan"
                                    size="sm"
                                    value={exportType}
                                    onChange={(v) => setExportType(v as ExportReportType)}
                                    options={exportOptions}
                                    width="100%"
                                />
                            </div>
                            <div className="pos-report-filter-btn">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Download size={15} />}
                                    label="Ekspor CSV"
                                    onClick={handleExportCSV}
                                    isDisabled={isExportDisabled}
                                    width="100%"
                                />
                            </div>
                        </div>
                    </div>

                    {/* KPI Summary Cards */}
                    <Grid columns={isMobile ? 2 : 4} gap={2}>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Total Revenue</Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '1.1rem' : '1.25rem',
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '-0.02em',
                                        color: '#09090b',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Rp {totalRev.toLocaleString('id-ID')}
                                </div>
                            </VStack>
                        </Card>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Total Transaksi</Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '1.1rem' : '1.25rem',
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '-0.02em',
                                        color: '#09090b',
                                    }}
                                >
                                    {summary.totalSales || 0}
                                </div>
                            </VStack>
                        </Card>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Gross Profit</Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '1.1rem' : '1.25rem',
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '-0.02em',
                                        color: '#059669',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Rp {grossProfit.toLocaleString('id-ID')}
                                </div>
                            </VStack>
                        </Card>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Margin Profit</Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '1.1rem' : '1.25rem',
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '-0.02em',
                                        color: '#059669',
                                    }}
                                >
                                    {margin}%
                                </div>
                            </VStack>
                        </Card>
                    </Grid>

                    <Divider />

                    {/* Tampilan Tabel Responsive */}
                    {isNarrow ? (
                        sales.length > 0 ? (
                            <VStack gap={2}>
                                {sales.map((s, i) => {
                                    const dayRev = Number(s.revenue || 0);
                                    const dayProfit = Number(s.profit || 0);
                                    const dayMargin = dayRev > 0 ? ((dayProfit / dayRev) * 100).toFixed(1) : '0.0';
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: 10,
                                                border: '1px solid #e4e4e7',
                                                backgroundColor: '#ffffff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10,
                                            }}
                                        >
                                            <HStack justify="between" align="center">
                                                <Text size="sm" weight="semibold">
                                                    {new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Text>
                                                <HStack gap={1.5} align="center">
                                                    <Badge variant="neutral" label={`${s.transactions} trx`} />
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            padding: '1px 6px',
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            backgroundColor: '#f0fdf4',
                                                            color: '#15803d',
                                                            border: '1px solid #dcfce7',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {dayMargin}%
                                                    </span>
                                                </HStack>
                                            </HStack>
                                            <HStack justify="between" align="center">
                                                <VStack gap={0}>
                                                    <Text size="xsm" color="secondary">Revenue</Text>
                                                    <Text size="sm" weight="bold" hasTabularNumbers>
                                                        Rp {dayRev.toLocaleString('id-ID')}
                                                    </Text>
                                                </VStack>
                                                <VStack align="end" gap={0}>
                                                    <Text size="xsm" color="secondary">Gross Profit</Text>
                                                    <span
                                                        style={{
                                                            color: '#059669',
                                                            fontWeight: 700,
                                                            fontSize: 14,
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        Rp {dayProfit.toLocaleString('id-ID')}
                                                    </span>
                                                </VStack>
                                            </HStack>
                                        </div>
                                    );
                                })}
                            </VStack>
                        ) : (
                            <EmptyState title="Tidak ada data penjualan pada periode ini" isCompact />
                        )
                    ) : (
                        <ScrollableArea label="Tabel data">
                            {sales.length > 0 ? (
                                <Table density="balanced" dividers="rows" hasHover>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHeaderCell>Tanggal</TableHeaderCell>
                                            <TableHeaderCell style={{ textAlign: 'right' }}>Transaksi</TableHeaderCell>
                                            <TableHeaderCell style={{ textAlign: 'right' }}>Revenue</TableHeaderCell>
                                            <TableHeaderCell style={{ textAlign: 'right' }}>Gross Profit</TableHeaderCell>
                                            <TableHeaderCell style={{ textAlign: 'right' }}>Margin (%)</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sales.map((s, i) => {
                                            const dayRev = Number(s.revenue || 0);
                                            const dayProfit = Number(s.profit || 0);
                                            const dayMargin = dayRev > 0 ? ((dayProfit / dayRev) * 100).toFixed(1) : '0.0';
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <Text size="sm" weight="medium">
                                                            {new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell style={{ textAlign: 'right' }}><span className="pos-table-num-cell">{s.transactions} trx</span></TableCell>
                                                    <TableCell style={{ textAlign: 'right' }}><span className="pos-table-num-cell">Rp {dayRev.toLocaleString('id-ID')}</span></TableCell>
                                                    <TableCell style={{ textAlign: 'right' }}>
                                                        <span
                                                            className="pos-table-num-cell"
                                                            style={{
                                                                color: '#059669',
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                            }}
                                                        >
                                                            Rp {dayProfit.toLocaleString('id-ID')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell style={{ textAlign: 'right' }}>
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                padding: '2px 8px',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                backgroundColor: '#f0fdf4',
                                                                color: '#15803d',
                                                                border: '1px solid #dcfce7',
                                                                fontVariantNumeric: 'tabular-nums',
                                                            }}
                                                        >
                                                            {dayMargin}%
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <EmptyState title="Tidak ada data penjualan pada periode ini" isCompact />
                            )}
                        </ScrollableArea>
                    )}
                </VStack>
            </Card>
        </VStack>
    );
};

export default Reports;