import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';

interface ChartData {
    date: string;
    amount: number;
}

interface RevenueChartProps {
    data: ChartData[];
    periodTotal?: number;
    onFilterChange?: (filter: 'today' | 'week' | 'month') => void;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, periodTotal, onFilterChange }) => {
    const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'month'>('today');

    const handleFilterChange = (val: string) => {
        const filter = val as 'today' | 'week' | 'month';
        setActiveFilter(filter);
        if (onFilterChange) onFilterChange(filter);
    };

    const computedTotal = periodTotal ?? data.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    return (
        <Card padding={4} elevation="none" height="100%">
            <VStack gap={4} height="100%">
                <HStack justify="between" align="start" wrap="wrap" gap={3}>
                    <VStack gap={0.5}>
                        <Heading level={4} weight="semibold">Tren Pendapatan</Heading>
                        <HStack gap={2} align="center">
                            <Text size="xsm" color="secondary">
                                Total periode ini:
                            </Text>
                            <Text size="xsm" weight="bold" hasTabularNumbers>
                                Rp {computedTotal.toLocaleString('id-ID')}
                            </Text>
                        </HStack>
                    </VStack>
                    <SegmentedControl
                        label="Filter periode"
                        value={activeFilter}
                        onChange={handleFilterChange}
                        size="sm"
                    >
                        <SegmentedControlItem value="today" label="Hari Ini" />
                        <SegmentedControlItem value="week" label="7 Hari" />
                        <SegmentedControlItem value="month" label="30 Hari" />
                    </SegmentedControl>
                </HStack>

                <div style={{ flex: 1, minHeight: 280, width: '100%' }}>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="chartGradientPro" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#18181b" stopOpacity={0.12} />
                                    <stop offset="100%" stopColor="#18181b" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#71717a', fontSize: 11 }}
                                interval="preserveStartEnd"
                                minTickGap={24}
                                dy={8}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#71717a', fontSize: 11 }}
                                tickFormatter={(val) => {
                                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                                    return val;
                                }}
                                width={46}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                    padding: '8px 12px',
                                }}
                                itemStyle={{ color: '#09090b', fontWeight: 600, fontSize: '13px' }}
                                labelStyle={{ color: '#71717a', fontSize: '11px', marginBottom: '2px' }}
                                formatter={(value: any) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, 'Pendapatan']}
                                cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#18181b"
                                strokeWidth={2}
                                fill="url(#chartGradientPro)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#18181b', stroke: '#ffffff', strokeWidth: 2 }}
                                animationDuration={600}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </VStack>
        </Card>
    );
};

export default RevenueChart;
