import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { TrendingUp, DollarSign, ShoppingBag, Users, Clock, Package, BarChart3, Calendar } from 'lucide-react';

interface DashboardStats {
    todayRevenue?: number; todayTransactions?: number;
    totalCustomers?: number; totalProducts?: number; lowStockCount?: number;
    topProducts?: { name: string; totalSold: number; revenue: number }[];
    [key: string]: any; // allow extra fields from API
}

const Reports = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [peakHours, setPeakHours] = useState<{ hour: number; count: number; revenue: number }[]>([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [salesReport, setSalesReport] = useState<any>(null);

    useEffect(() => { fetchDashboard(); fetchPeakHours(); }, []);

    const fetchDashboard = async () => { try { const r = await api.get('/reports/dashboard'); setStats(r.data); } catch (e) { console.error(e); } };
    const fetchPeakHours = async () => { try { const r = await api.get('/reports/peak-hours'); setPeakHours(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); } };
    const fetchSalesReport = async () => {
        if (!dateRange.start || !dateRange.end) return;
        try { const r = await api.get('/reports/sales', { params: dateRange }); setSalesReport(r.data); } catch (e) { console.error(e); }
    };

    const maxPeakCount = Math.max(...peakHours.map(p => p.count), 1);
    const topProducts = stats?.topProducts || [];

    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-indigo-400" /> Laporan & Analytics
            </h1>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={DollarSign} label="Revenue Hari Ini" value={`Rp ${(Number(stats.todayRevenue) || 0).toLocaleString('id-ID')}`} color="emerald" />
                    <StatCard icon={ShoppingBag} label="Transaksi Hari Ini" value={String(stats.todayTransactions ?? 0)} color="blue" />
                    <StatCard icon={TrendingUp} label="Total Produk" value={String(stats.totalProducts ?? 0)} color="indigo" />
                    <StatCard icon={Users} label="Total Pelanggan" value={String(stats.totalCustomers ?? 0)} color="purple" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Products */}
                {topProducts.length > 0 && (
                    <div className="glass-card rounded-2xl border border-white/10 p-5">
                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-indigo-400" /> Top Produk</h3>
                        <div className="space-y-3">
                            {topProducts.map((p, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-600/20 text-orange-400'}`}>{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/80 text-sm truncate">{p.name}</p>
                                        <p className="text-white/30 text-[10px]">{p.totalSold} terjual</p>
                                    </div>
                                    <span className="text-indigo-400 text-xs font-bold">Rp {(Number(p.revenue) || 0).toLocaleString('id-ID')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Peak Hours */}
                {peakHours.length > 0 && (
                    <div className="glass-card rounded-2xl border border-white/10 p-5">
                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-400" /> Jam Sibuk</h3>
                        <div className="space-y-2">
                            {peakHours.slice(0, 8).map((p, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-white/50 text-xs w-12">{String(p.hour).padStart(2, '0')}:00</span>
                                    <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500/50 to-purple-500/50 rounded-full transition-all"
                                            style={{ width: `${(p.count / maxPeakCount) * 100}%` }} />
                                    </div>
                                    <span className="text-white/40 text-[10px] w-8 text-right">{p.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Date Range Report */}
            <div className="glass-card rounded-2xl border border-white/10 p-5">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" /> Laporan Penjualan</h3>
                <div className="flex gap-3 mb-4">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                    <button onClick={fetchSalesReport}
                        className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors">
                        Generate
                    </button>
                </div>
                {salesReport && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-white/40 text-xs mb-1">Total Penjualan</p>
                            <p className="text-emerald-400 text-lg font-bold">Rp {(Number(salesReport.totalRevenue) || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-white/40 text-xs mb-1">Total Transaksi</p>
                            <p className="text-blue-400 text-lg font-bold">{salesReport.totalTransactions || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-white/40 text-xs mb-1">Profit Margin</p>
                            <p className="text-purple-400 text-lg font-bold">{salesReport.profitMargin?.toFixed(1) || 0}%</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => {
    const colorMap: Record<string, string> = {
        emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
        blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
        indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
        purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
    };
    return (
        <div className={`rounded-2xl border p-4 bg-gradient-to-br ${colorMap[color]}`}>
            <Icon className="w-5 h-5 mb-2" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">{label}</p>
            <p className="text-white text-lg font-bold mt-0.5">{value}</p>
        </div>
    );
};

export default Reports;
