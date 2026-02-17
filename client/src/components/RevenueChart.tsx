import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
    date: string;
    amount: number;
}

interface RevenueChartProps {
    data: ChartData[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
    return (
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>

            <h3 className="text-xl font-bold text-white mb-6 relative z-10 flex items-center">
                <span className="w-2 h-8 bg-indigo-600 rounded-full mr-3"></span>
                Revenue Trend
            </h3>

            <div className="h-80 relative z-10">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>

                    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(8px)'
                            }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: any) => [`Rp ${value?.toLocaleString() || 0}`, "Revenue"]}
                        />
                        <Bar
                            dataKey="amount"
                            fill="url(#barGradient)"
                            name="Revenue"
                            radius={[6, 6, 0, 0]}
                            barSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RevenueChart;

