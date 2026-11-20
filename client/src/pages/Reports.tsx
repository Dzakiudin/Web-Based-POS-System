import { useState, useEffect } from 'react';
import { Wallet, ReceiptText, Users, AlertTriangle, Download } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { Badge } from '@astryxdesign/core/Badge';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import StatCard from '../components/StatCard';
import { downloadOrShareFile } from '../lib/fileHelper';

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

const Reports = () => {
    const isNarrow = useMediaQuery('(max-width: 1024px)');
    const [stats, setStats] = useState<DashboardStats>({});
    const [sales, setSales] = useState<SaleReport[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [peakHours, setPeakHours] = useState<PeakHour[]>([]);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        api.get('/reports/dashboard').then((r) => setStats(r.data || {})).catch(console.error);
        api.get('/reports/top-products').then((r) => setTopProducts(Array.isArray(r.data) ? r.data : [])).catch(console.error);
        api.get('/reports/peak-hours').then((r) => setPeakHours(Array.isArray(r.data) ? r.data : [])).catch(console.error);
    }, []);

    useEffect(() => {
        api.get('/reports/sales', { params: { startDate, endDate } })
            .then((r) => {
                setSales(Array.isArray(r.data?.chartData) ? r.data.chartData : []);
                setSummary(r.data?.summary || {});
            })
            .catch(console.error);
    }, [startDate, endDate]);

    const totalRev = Number(summary.totalRevenue || 0);
    const grossProfit = Number(summary.grossProfit || 0);
    const margin = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : '0.0';

    const handleExportCSV = async () => {
        if (!sales.length) return;
        const headers = ['Tanggal', 'Jumlah Transaksi', 'Revenue (Rp)', 'Profit (Rp)'];
        const rows = sales.map((s) => [
            s.date,
            s.transactions,
            s.revenue,
            s.profit,
        ]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        await downloadOrShareFile(blob, `laporan-penjualan-${startDate}-sd-${endDate}.csv`, 'text/csv');
    };

    return (
        <VStack gap={5} width="100%">
            {/* KPI Row */}
            <Grid columns={{ minWidth: 200, max: 4 }} gap={3}>
                <StatCard
                    title="Pendapatan Hari Ini"
                    value={`Rp ${Number(stats.todayRevenue || 0).toLocaleString('id-ID')}`}
                    icon={<Wallet size={18} />}
                />
                <StatCard
                    title="Transaksi Hari Ini"
                    value={stats.todayTransactions || 0}
                    icon={<ReceiptText size={18} />}
                />
                <StatCard
                    title="Total Pelanggan"
                    value={stats.totalCustomers || 0}
                    icon={<Users size={18} />}
                />
                <StatCard
                    title="Stok Rendah"
                    value={stats.lowStockCount || 0}
                    icon={<AlertTriangle size={18} />}
                />
            </Grid>

            {/* Charts Row */}
            <Grid columns={isNarrow ? 1 : 2} gap={4}>
                <Card padding={4} elevation="none">
                    <VStack gap={3}>
                        <VStack gap={0.5}>
                            <Heading level={4} weight="semibold">Grafik Pendapatan</Heading>
                            <Text size="xsm" color="secondary">Tren pendapatan harian berdasarkan periode</Text>
                        </VStack>
                        <div style={{ width: '100%', height: 260 }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={sales}>
                                    <defs>
                                        <linearGradient id="reportRevLight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#18181b" stopOpacity={0.14} />
                                            <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10 }}
                                        formatter={(val: any) => [`Rp ${Number(val || 0).toLocaleString('id-ID')}`, 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2.2} fill="url(#reportRevLight)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </VStack>
                </Card>

                <Card padding={4} elevation="none">
                    <VStack gap={3}>
                        <VStack gap={0.5}>
                            <Heading level={4} weight="semibold">Jam Ramai (Peak Hours)</Heading>
                            <Text size="xsm" color="secondary">Distribusi jumlah transaksi per jam</Text>
                        </VStack>
                        <div style={{ width: '100%', height: 260 }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10 }} />
                                    <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </VStack>
                </Card>
            </Grid>

            {/* Top Products */}
            <Card padding={4} elevation="none">
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
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f4f4f5' : '#fafafa',
                                                    color: i === 0 ? '#b45309' : '#52525b',
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
                                                <TableCell><Text size="sm" weight="bold">{i + 1}</Text></TableCell>
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
            <Card padding={4} elevation="none">
                <VStack gap={4}>
                    <HStack justify="between" align="end" wrap="wrap" gap={3}>
                        <VStack gap={0.5}>
                            <Heading level={4} weight="semibold">Laporan Penjualan Periodik</Heading>
                            <Text size="xsm" color="secondary">Ringkasan omzet dan laba kotor per tanggal</Text>
                        </VStack>
                        <HStack gap={2} wrap="wrap" align="end">
                            <DateInput label="Dari" value={startDate as any} onChange={(v) => v && setStartDate(v)} size="sm" />
                            <DateInput label="Sampai" value={endDate as any} onChange={(v) => v && setEndDate(v)} size="sm" />
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={<Download size={15} />}
                                label="Ekspor CSV"
                                onClick={handleExportCSV}
                                isDisabled={sales.length === 0}
                            />
                        </HStack>
                    </HStack>

                    <Grid columns={{ minWidth: isNarrow ? 140 : 160, max: 4 }} gap={2}>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Total Revenue</Text>
                                <Heading level={4} weight="bold">Rp {totalRev.toLocaleString('id-ID')}</Heading>
                            </VStack>
                        </Card>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Total Transaksi</Text>
                                <Heading level={4} weight="bold">{summary.totalSales || 0}</Heading>
                            </VStack>
                        </Card>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Gross Profit</Text>
                                <Heading level={4} weight="bold">Rp {grossProfit.toLocaleString('id-ID')}</Heading>
                            </VStack>
                        </Card>
                        <Card padding={3} variant="muted" elevation="none">
                            <VStack gap={0.5}>
                                <Text size="xsm" color="secondary">Margin Profit</Text>
                                <Heading level={4} weight="bold">{margin}%</Heading>
                            </VStack>
                        </Card>
                    </Grid>

                    <Divider />

                    {isNarrow ? (
                        sales.length > 0 ? (
                            <VStack gap={2}>
                                {sales.map((s, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 10,
                                            border: '1px solid #e4e4e7',
                                            backgroundColor: '#ffffff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                        }}
                                    >
                                        <HStack justify="between" align="center">
                                            <Text size="sm" weight="semibold">
                                                {new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Text>
                                            <Badge variant="neutral" label={`${s.transactions} trx`} />
                                        </HStack>
                                        <HStack justify="between" align="center">
                                            <VStack gap={0}>
                                                <Text size="xsm" color="secondary">Revenue</Text>
                                                <Text size="sm" weight="bold" hasTabularNumbers>
                                                    Rp {Number(s.revenue || 0).toLocaleString('id-ID')}
                                                </Text>
                                            </VStack>
                                            <VStack align="end" gap={0}>
                                                <Text size="xsm" color="secondary">Profit</Text>
                                                <Text size="sm" weight="semibold" hasTabularNumbers style={{ color: '#16a34a' }}>
                                                    Rp {Number(s.profit || 0).toLocaleString('id-ID')}
                                                </Text>
                                            </VStack>
                                        </HStack>
                                    </div>
                                ))}
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
                                            <TableHeaderCell>Transaksi</TableHeaderCell>
                                            <TableHeaderCell>Revenue</TableHeaderCell>
                                            <TableHeaderCell>Profit</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sales.map((s, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <Text size="sm">{new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                                                </TableCell>
                                                <TableCell><Text size="sm" hasTabularNumbers>{s.transactions}</Text></TableCell>
                                                <TableCell><Text size="sm" weight="semibold" hasTabularNumbers>Rp {Number(s.revenue || 0).toLocaleString('id-ID')}</Text></TableCell>
                                                <TableCell><Text size="sm" hasTabularNumbers>Rp {Number(s.profit || 0).toLocaleString('id-ID')}</Text></TableCell>
                                            </TableRow>
                                        ))}
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
