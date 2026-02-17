import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { DollarSign, ShoppingCart, TrendingUp, Sparkles, Activity, PackageCheck, Users } from 'lucide-react';
import StatCard from '../components/StatCard';
import RevenueChart from '../components/RevenueChart';
import { useAuth } from '../context/AuthContext';
import LiveClock from '../components/LiveClock';

interface SaleData {
    id: number;
    totalPrice: string;
    date: string;
}

const Dashboard = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<SaleData[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalTransactions: 0,
        averageOrderValue: 0,
    });

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await api.get('/sales');
            const data = response.data;
            setSales(data);
            calculateStats(data);
        } catch (error) {
            console.error('Error fetching sales', error);
        }
    };

    const calculateStats = (data: SaleData[]) => {
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

            {/* Chart & Quick Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 group">
                    <div className="transition-all duration-500 hover:scale-[1.01]">
                        <RevenueChart data={prepareChartData()} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 blur-[40px] rounded-full -mr-12 -mt-12 group-hover:bg-purple-600/20 transition-all duration-700"></div>
                        <h4 className="text-white font-bold mb-4 flex items-center">
                            <PackageCheck className="text-purple-400 mr-2" size={18} />
                            Quick Service
                        </h4>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Access high-traffic transactions and product inventory directly.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="px-4 py-3 bg-white/5 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all duration-300 border border-white/5 active:scale-95">
                                NEW SALE
                            </button>
                            <button className="px-4 py-3 bg-white/5 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all duration-300 border border-white/5 active:scale-95">
                                INVENTORY
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border-dashed border-white/10">
                        <h4 className="text-white font-bold mb-2 flex items-center">
                            <Users className="text-slate-400 mr-2" size={18} />
                            Active Staff
                        </h4>
                        <div className="flex -space-x-3 mt-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-950 bg-indigo-600 flex items-center justify-center text-xs font-bold shadow-xl">
                                    S{i + 1}
                                </div>
                            ))}
                            <div className="w-10 h-10 rounded-full border-2 border-indigo-950 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shadow-xl">
                                +2
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;


