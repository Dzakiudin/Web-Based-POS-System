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
        return sales.reduce((acc: any[], sale) => {
            const date = new Date(sale.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const existing = acc.find((item) => item.date === date);
            if (existing) {
                existing.amount += parseFloat(sale.totalPrice);
            } else {
                acc.push({ date, amount: parseFloat(sale.totalPrice) });
            }
            return acc;
        }, []).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10);
    };

    return (
        <div className="space-y-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Area */}
                <div className="lg:col-span-2">
                    <RevenueChart data={prepareChartData()} />
                </div>

                {/* Right Side */}
                <div className="flex flex-col gap-6">
                    {/* Quick Actions */}
                    <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <a href="/transactions" className="col-span-2 flex items-center justify-center gap-2 bg-primary hover:bg-green-400 text-background-dark font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-primary/20">
                                <span className="material-symbols-outlined">add_shopping_cart</span>
                                New Transaction
                            </a>
                            <a href="/products" className="flex flex-col items-center justify-center gap-1 bg-background-dark hover:bg-card-hover border border-border-dark text-white py-3 px-4 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-primary">add_box</span>
                                <span className="text-xs font-semibold">Add Product</span>
                            </a>
                            <a href="/customers" className="flex flex-col items-center justify-center gap-1 bg-background-dark hover:bg-card-hover border border-border-dark text-white py-3 px-4 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-orange-400">person_add</span>
                                <span className="text-xs font-semibold">Add Member</span>
                            </a>
                        </div>
                    </div>

                    {/* Active Staff */}
                    <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg flex-1">
                        <h3 className="text-lg font-bold text-white mb-4">Active Staff</h3>
                        {staff.length > 0 ? (
                            <div className="space-y-3">
                                {staff.map((s) => (
                                    <div key={s.id} className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                            {s.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                            <p className="text-xs text-text-subtle">{s.role}</p>
                                        </div>
                                        <div className="size-2.5 rounded-full bg-primary animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-subtle text-sm">No staff data</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <div className="px-6 py-4 border-b border-border-dark flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                    <a className="text-primary text-sm font-semibold hover:underline" href="/transaction-history">View All</a>
                </div>
                <div className="divide-y divide-border-dark">
                    {sales.slice(0, 3).map((sale, i) => (
                        <div key={sale.id || i} className="px-6 py-4 hover:bg-card-hover transition-colors flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-background-dark flex items-center justify-center text-text-subtle border border-border-dark">
                                    <span className="material-symbols-outlined text-sm">receipt</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Order #{sale.id}</p>
                                    <p className="text-xs text-text-subtle">Completed by <span className="text-white">{user?.name || 'Staff'}</span></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-primary">+ Rp {Number(sale.totalPrice).toLocaleString()}</p>
                                <p className="text-xs text-text-subtle">{new Date(sale.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    ))}
                    {sales.length === 0 && (
                        <div className="px-6 py-8 text-center text-text-subtle text-sm">
                            No recent activity
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
