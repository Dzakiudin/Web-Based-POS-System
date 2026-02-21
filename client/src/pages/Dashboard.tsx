import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { DollarSign, ShoppingCart, TrendingUp, Sparkles, Activity, Users } from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { useAuth } from '../context/AuthContext';
import LiveClock from '../components/LiveClock';

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

const ROLE_COLORS: Record<string, string> = {
    OWNER: 'bg-amber-500',
    ADMIN: 'bg-indigo-500',
    CASHIER: 'bg-emerald-500',
};

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
            // API returns { sales: [], total } — extract the array
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

        setStats({
            totalRevenue,
            totalTransactions,
            averageOrderValue,
        });
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
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-indigo-400">
                        <Activity size={16} className="animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Real-time Overview</span>
                    </div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-center">
                        <Sparkles className="text-indigo-400 mr-4 w-10 h-10 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
                        Dashboard
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Welcome back, <span className="text-indigo-400 font-bold">{user?.name}</span>. Here's your performance for today.
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <LiveClock />
                    <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                        <span>Live Syncing</span>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`Rp ${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-indigo-600"
                />
                <StatCard
                    title="Total Transactions"
                    value={stats.totalTransactions}
                    icon={ShoppingCart}
                    color="bg-emerald-600"
                />
                <StatCard
                    title="Avg. Order Value"
                    value={`Rp ${stats.averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp}
                    color="bg-amber-600"
                />
            </div>

            {/* Chart & Active Staff */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 group">
                    <div className="transition-all duration-500 hover:scale-[1.01]">
                        <RevenueChart data={prepareChartData()} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border-dashed border-white/10">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 blur-[40px] rounded-full -mr-12 -mt-12 group-hover:bg-purple-600/20 transition-all duration-700"></div>
                        <h4 className="text-white font-bold mb-4 flex items-center">
                            <Users className="text-indigo-400 mr-2" size={18} />
                            Active Staff
                            <span className="ml-auto text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">{staff.length}</span>
                        </h4>
                        {staff.length > 0 ? (
                            <div className="space-y-2.5">
                                {staff.map((s) => (
                                    <div key={s.id} className="flex items-center gap-3 group/item">
                                        <div className={`w-9 h-9 rounded-full ${ROLE_COLORS[s.role] || 'bg-slate-600'} flex items-center justify-center text-xs font-bold text-white shadow-xl`}>
                                            {s.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white/80 text-sm font-medium truncate">{s.name}</p>
                                            <p className="text-white/30 text-[10px]">{s.role}</p>
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No staff data</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;


