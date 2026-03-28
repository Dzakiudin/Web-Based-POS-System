import { useState, useEffect } from 'react';
import api from '../lib/axios';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { useAuth } from '../context/AuthContext';

interface SaleData {
    id: number;
    totalPrice: string;
    date: string;
}

interface StaffMember {
    id: number;
    name: string;
    role: string;
}

const Dashboard = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<SaleData[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [chartFilter, setChartFilter] = useState<'today' | 'week' | 'month'>('today');
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
    });

    useEffect(() => {
        fetchSales();
        fetchStaff();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await api.get('/sales');
            const raw = response.data;
            const data = Array.isArray(raw) ? raw : (raw.sales || []);
            setSales(data);
            calculateStats(data);
        } catch (error) {
            console.error('Error fetching sales', error);
        }
    };

    const fetchStaff = async () => {
        try {
            const r = await api.get('/users');
            const data = Array.isArray(r.data) ? r.data : (r.data.users || []);
            setStaff(data);
        } catch (error) {
            console.error('Error fetching staff', error);
        }
    };

    const calculateStats = (data: SaleData[]) => {
        if (!Array.isArray(data)) return;
        const totalRevenue = data.reduce((sum, sale) => sum + parseFloat(sale.totalPrice), 0);
        const totalTransactions = data.length;
        const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        setStats({ totalRevenue, totalTransactions, averageOrderValue });
    };

    const prepareChartData = () => {
        if (!Array.isArray(sales) || sales.length === 0) return [];

        const now = new Date();
        const filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            if (chartFilter === 'today') {
                return saleDate.toDateString() === now.toDateString();
            } else if (chartFilter === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                return saleDate >= weekAgo;
            } else {
                const monthAgo = new Date();
                monthAgo.setMonth(now.getMonth() - 1);
                return saleDate >= monthAgo;
            }
        });

        const grouped = filteredSales.reduce((acc: any[], sale) => {
            const date = new Date(sale.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const existing = acc.find((item) => item.date === date);
            if (existing) {
                existing.amount += parseFloat(sale.totalPrice);
            } else {
                acc.push({ date, amount: parseFloat(sale.totalPrice) });
            }
            return acc;
        }, []);

        return grouped.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Sales Today"
                    value={`Rp ${stats.totalRevenue.toLocaleString()}`}
                    icon="payments"
                    iconColor="text-primary"
                    trend="+12.5%"
                    trendUp={true}
                />
                <StatCard
                    title="Total Transactions"
                    value={stats.totalTransactions}
                    icon="receipt"
                    iconColor="text-blue-400"
                    trend="+5.2%"
                    trendUp={true}
                />
                <StatCard
                    title="Active Staff"
                    value={`${staff.length} Online`}
                    icon="group"
                    iconColor="text-orange-400"
                />
                <StatCard
                    title="Avg. Order Value"
                    value={`Rp ${stats.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon="timer"
                    iconColor="text-purple-400"
                    trend="+8%"
                    trendUp={true}
                />
            </div>

            {/* Chart + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Chart Area */}
                <div className="lg:col-span-2 flex flex-col">
                    <RevenueChart
                        data={prepareChartData()}
                        onFilterChange={(f) => setChartFilter(f)}
                    />
                </div>

                {/* Right Side */}
                <div className="flex flex-col gap-6 h-full">
                    {/* Quick Actions */}
                    <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <a href="/transactions" className="col-span-2 flex items-center justify-center gap-2 bg-primary hover:bg-green-400 text-background-dark font-bold py-3.5 px-4 rounded-lg transition-all shadow-lg shadow-primary/20 transform hover:-translate-y-0.5 active:translate-y-0">
                                <span className="material-symbols-outlined font-bold">add_shopping_cart</span>
                                New Transaction
                            </a>
                            <a href="/products" className="flex flex-col items-center justify-center gap-1.5 bg-background-dark hover:bg-card-hover border border-border-dark text-white py-3.5 px-4 rounded-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                                <span className="material-symbols-outlined text-primary">add_box</span>
                                <span className="text-xs font-bold uppercase tracking-wider">Add Product</span>
                            </a>
                            <a href="/customers" className="flex flex-col items-center justify-center gap-1.5 bg-background-dark hover:bg-card-hover border border-border-dark text-white py-3.5 px-4 rounded-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                                <span className="material-symbols-outlined text-orange-400">person_add</span>
                                <span className="text-xs font-bold uppercase tracking-wider">Add Member</span>
                            </a>
                        </div>
                    </div>

                    {/* Active Staff */}
                    <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-4">Active Staff</h3>
                        {staff.length > 0 ? (
                            <div className="space-y-4 flex-1">
                                {staff.slice(0, 5).map((s) => (
                                    <div key={s.id} className="flex items-center gap-4 group">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                            {s.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{s.name}</p>
                                            <p className="text-[10px] text-text-subtle uppercase font-bold tracking-widest">{s.role}</p>
                                        </div>
                                        <div className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(19,236,91,0.5)]"></div>
                                    </div>

                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <span className="material-symbols-outlined text-4xl text-text-subtle/30 mb-2">person_off</span>
                                <p className="text-text-subtle text-sm">No staff online</p>
                            </div>
                        )}
                        <a href="/employees" className="mt-4 text-center text-xs font-bold text-text-subtle hover:text-white transition-colors py-2 border-t border-border-dark pt-4">MANAGE ALL EMPLOYEES</a>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <div className="px-6 py-5 border-b border-border-dark flex justify-between items-center bg-background-dark/30">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history</span>
                        Recent Activity
                    </h3>
                    <a className="text-primary text-sm font-bold hover:underline flex items-center gap-1" href="/transaction-history">
                        View All <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </a>
                </div>
                <div className="divide-y divide-border-dark/50">
                    {sales.slice(0, 5).map((sale, i) => (
                        <div key={sale.id || i} className="px-6 py-4 hover:bg-card-hover transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-background-dark flex items-center justify-center text-text-subtle border border-border-dark group-hover:border-primary/30 transition-colors">
                                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Order #{sale.id || `TX-${Math.floor(Math.random() * 1000)}`}</p>
                                    <p className="text-xs text-text-subtle">By <span className="text-white font-medium">{user?.name || 'Staff'}</span> • {new Date(sale.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-primary">Rp {Number(sale.totalPrice).toLocaleString()}</p>
                                <p className="text-[10px] text-text-subtle font-bold uppercase tracking-wider">{new Date(sale.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    ))}
                    {sales.length === 0 && (
                        <div className="px-6 py-12 text-center text-text-subtle">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">history_toggle_off</span>
                            <p className="text-sm">No recent transactions recorded</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
