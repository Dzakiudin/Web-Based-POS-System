import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
    date: string;
    amount: number;
}

interface RevenueChartProps {
    data: ChartData[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
    return (
        <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Revenue Trend</h3>
                    <p className="text-sm text-text-subtle">Sales performance overview</p>
                </div>
                <div className="flex bg-background-dark rounded-lg p-1">
                    <button className="px-3 py-1 rounded bg-card-hover text-white text-xs font-medium shadow-sm">Today</button>
                    <button className="px-3 py-1 rounded text-text-subtle hover:text-white text-xs font-medium transition-colors">Week</button>
                    <button className="px-3 py-1 rounded text-text-subtle hover:text-white text-xs font-medium transition-colors">Month</button>
                </div>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#13ec5b" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#13ec5b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#28392e" vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9db9a6', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9db9a6', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a261e',
                                border: '1px solid #28392e',
                                borderRadius: '8px',
                            }}
                            itemStyle={{ color: '#e2e8f0' }}
                            formatter={(value: any) => [`Rp ${value?.toLocaleString() || 0}`, "Revenue"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#13ec5b"
                            strokeWidth={3}
                            fill="url(#chartGradient)"
                            name="Revenue"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RevenueChart;
