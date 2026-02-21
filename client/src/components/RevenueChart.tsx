import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
    date: string;
    amount: number;
}

interface RevenueChartProps {
    data: ChartData[];
    onFilterChange?: (filter: 'today' | 'week' | 'month') => void;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, onFilterChange }) => {
    const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'month'>('today');

    const handleFilterClick = (filter: 'today' | 'week' | 'month') => {
        setActiveFilter(filter);
        if (onFilterChange) onFilterChange(filter);
    };

    return (
        <div className="bg-card-dark rounded-xl border border-border-dark p-6 shadow-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Revenue Trend</h3>
                    <p className="text-sm text-text-subtle">Sales performance overview</p>
                </div>
                <div className="flex bg-background-dark rounded-lg p-1 gap-1">
                    {(['today', 'week', 'month'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => handleFilterClick(f)}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeFilter === f
                                ? 'bg-primary text-background-dark shadow-sm'
                                : 'text-text-subtle hover:text-white hover:bg-card-hover'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                            tick={{ fill: '#9db9a6', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9db9a6', fontSize: 11 }}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111813',
                                border: '1px solid #28392e',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                            }}
                            itemStyle={{ color: '#13ec5b', fontWeight: 'bold' }}
                            labelStyle={{ color: '#9db9a6', fontSize: '12px', marginBottom: '4px' }}
                            formatter={(value: any) => [`Rp ${value?.toLocaleString() || 0}`, "Revenue"]}
                            cursor={{ stroke: '#13ec5b', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#13ec5b"
                            strokeWidth={3}
                            fill="url(#chartGradient)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RevenueChart;
