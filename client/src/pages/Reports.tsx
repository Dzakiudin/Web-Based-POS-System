import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
    todayRevenue?: number; todayTransactions?: number;
    totalCustomers?: number; totalProducts?: number; lowStockCount?: number;
}

interface TopProduct {
    product: { name: string; id: number };
    totalQuantity: number;
    totalRevenue: string;
}

interface SaleReport { date: string; revenue: number; transactions: number; profit: number; }

interface PeakHour {
    hour: number;
    label: string;
    count: number;
    revenue: number;
}

const Reports = () => {
    const [stats, setStats] = useState<DashboardStats>({});
    const [sales, setSales] = useState<SaleReport[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [peakHours, setPeakHours] = useState<PeakHour[]>([]);

    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        api.get('/reports/dashboard').then(r => setStats(r.data)).catch(console.error);
        api.get('/reports/top-products').then(r => setTopProducts(r.data)).catch(console.error);
        api.get('/reports/peak-hours').then(r => setPeakHours(r.data)).catch(console.error);
    }, []);

    useEffect(() => {
        api.get('/reports/sales', { params: { startDate, endDate } })
            .then(r => {
                setSales(r.data.chartData || []);
                setSummary(r.data.summary || {});
            })
            .catch(console.error);
    }, [startDate, endDate]);

    return (
        <div className="space-y-6 pb-10">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: 'payments', label: 'Pendapatan Hari Ini', value: `Rp ${(stats.todayRevenue || 0).toLocaleString('id-ID')}`, color: 'text-primary' },
                    { icon: 'receipt_long', label: 'Transaksi Hari Ini', value: stats.todayTransactions || 0, color: 'text-blue-400' },
                    { icon: 'group', label: 'Total Pelanggan', value: stats.totalCustomers || 0, color: 'text-amber-400' },
                    { icon: 'inventory_2', label: 'Stok Rendah', value: stats.lowStockCount || 0, color: 'text-red-400' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-card-dark rounded-xl border border-border-dark p-4 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined text-[18px] ${kpi.color}`}>{kpi.icon}</span>
                            <span className="text-text-subtle text-xs uppercase font-semibold">{kpi.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">show_chart</span> Tren Pendapatan
                        </h3>
                        <p className="text-sm text-text-subtle">Informasi pendapatan harian dalam periode terpilih</p>
                    </div>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sales} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#13ec5b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#28392e" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9db9a6', fontSize: 10 }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9db9a6', fontSize: 10 }}
                                tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a261e', border: '1px solid #28392e', borderRadius: '8px' }}
                                itemStyle={{ color: '#13ec5b' }}
                                labelStyle={{ color: '#white', fontWeight: 'bold', marginBottom: '4px' }}
                                formatter={(val: any) => [`Rp ${val.toLocaleString('id-ID')}`, 'Revenue']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#13ec5b" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg h-fit">
                    <div className="p-4 border-b border-border-dark">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span> Produk Terlaris
                        </h3>
                    </div>
                    <table className="w-full">
                        <thead><tr className="border-b border-border-dark bg-background-dark">
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold">#</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold">Produk</th>
                            <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold">Terjual</th>
                            <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold">Revenue</th>
                        </tr></thead>
                        <tbody>
                            {topProducts.map((p, i) => (
                                <tr key={i} className="border-b border-border-dark hover:bg-card-hover transition-colors">
                                    <td className="px-5 py-3 text-primary font-bold text-sm">{i + 1}</td>
                                    <td className="px-5 py-3 text-white text-sm">{p.product?.name || 'Unknown'}</td>
                                    <td className="px-5 py-3 text-right text-text-subtle text-sm">{p.totalQuantity}</td>
                                    <td className="px-5 py-3 text-right text-primary text-sm font-semibold">Rp {Number(p.totalRevenue).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Peak Hours Container (Manual Bar for variety) */}
                <div className="bg-card-dark rounded-xl border border-border-dark p-5 shadow-lg h-fit">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary text-[18px]">schedule</span> Jam Sibuk (30 Hari Terakhir)
                    </h3>
                    <div className="flex items-end gap-1 h-32 mt-8">
                        {peakHours.map((h, i) => {
                            const max = Math.max(...peakHours.map(x => x.count), 1);
                            const pct = (h.count / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background-dark border border-border-dark px-2 py-0.5 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                        {h.count} trans
                                    </div>
                                    <div className="w-full rounded-t-md bg-primary/20 relative" style={{ height: `${Math.max(pct, 4)}%` }}>
                                        <div className="absolute inset-0 rounded-t-md bg-primary" style={{ opacity: Math.max(pct / 100, 0.2) }} />
                                    </div>
                                    <span className="text-text-subtle/60 text-[8px] rotate-45 mt-2 origin-left">{h.hour}:00</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sales Table Report */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <div className="p-4 border-b border-border-dark flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span> Laporan Rinci Penjualan
                    </h3>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-background-dark border border-border-dark text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                        <span className="text-text-subtle text-xs">—</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-background-dark border border-border-dark text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                </div>

                {/* Summary Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-border-dark bg-background-dark/30">
                    <div>
                        <p className="text-text-subtle text-xs mb-1 uppercase font-semibold">Total Revenue</p>
                        <p className="text-primary text-lg font-bold">Rp {(summary.totalRevenue || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                        <p className="text-text-subtle text-xs mb-1 uppercase font-semibold">Total Transaksi</p>
                        <p className="text-white text-lg font-bold">{summary.totalTransactions || 0}</p>
                    </div>
                    <div>
                        <p className="text-text-subtle text-xs mb-1 uppercase font-semibold">Gross Profit</p>
                        <p className="text-blue-400 text-lg font-bold">Rp {(summary.grossProfit || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                        <p className="text-text-subtle text-xs mb-1 uppercase font-semibold">Margin Profit</p>
                        <p className="text-amber-400 text-lg font-bold">{summary.profitMargin || 0}%</p>
                    </div>
                </div>

                <table className="w-full">
                    <thead><tr className="border-b border-border-dark">
                        <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold">Tanggal</th>
                        <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold">Transaksi</th>
                        <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold">Revenue</th>
                        <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold">Profit</th>
                    </tr></thead>
                    <tbody>
                        {sales.map((s, i) => (
                            <tr key={i} className="border-b border-border-dark hover:bg-card-hover transition-colors">
                                <td className="px-5 py-3 text-white text-sm">{new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                <td className="px-5 py-3 text-right text-text-subtle text-sm">{s.transactions}</td>
                                <td className="px-5 py-3 text-right text-primary text-sm font-semibold">Rp {s.revenue.toLocaleString('id-ID')}</td>
                                <td className="px-5 py-3 text-right text-blue-400 text-sm">Rp {s.profit.toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sales.length === 0 && <div className="text-center py-16 text-text-subtle text-sm">Tidak ada data penjualan untuk periode ini</div>}
            </div>
        </div>
    );
};

export default Reports;
