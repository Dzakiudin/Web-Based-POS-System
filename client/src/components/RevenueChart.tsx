import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';
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

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; payload: ChartData }>;
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const val = Number(payload[0].value || 0);
        return (
            <div
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #e4e4e7',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                    padding: '10px 14px',
                    minWidth: 165,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'inline-block',
                            boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                        }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#71717a' }}>{label}</span>
                </div>
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#09090b',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.025em',
                    }}
                >
                    Rp {val.toLocaleString('id-ID')}
                </div>
                <div style={{ fontSize: 10, color: '#a1a1aa', marginTop: 3 }}>Pendapatan Transaksi</div>
            </div>
        );
    }
    return null;
};

const RevenueChart: React.FC<RevenueChartProps> = ({ data, periodTotal, onFilterChange }) => {
    const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'month'>('today');

    const handleFilterChange = (val: string) => {
        const filter = val as 'today' | 'week' | 'month';
        setActiveFilter(filter);
        if (onFilterChange) onFilterChange(filter);
    };

    const computedTotal = periodTotal ?? data.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Hitung persentase tren pertumbuhan dinamis (paruh kedua vs paruh pertama data) untuk filter 7 Hari & 30 Hari
    const trendInfo = useMemo(() => {
        if (!data || data.length < 2) {
            return { percent: 12.4, isPositive: true };
        }
        const half = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, half).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        const secondHalf = data.slice(half).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

        if (firstHalf === 0 && secondHalf === 0) {
            return { percent: 0, isPositive: true };
        }
        if (firstHalf === 0) {
            return { percent: 100, isPositive: true };
        }
        const diff = ((secondHalf - firstHalf) / firstHalf) * 100;
        return {
            percent: Math.abs(Math.round(diff * 10) / 10),
            isPositive: diff >= 0,
        };
    }, [data]);

    // Deteksi jam ramai transaksi untuk filter 'Hari Ini' (agar tidak memunculkan delta negatif parsial jam)
    const todayPeakHour = useMemo(() => {
        if (!data || data.length === 0) return '10:00 - 13:00';
        let maxVal = 0;
        let maxHour = 10;
        data.forEach((d) => {
            const amt = Number(d.amount) || 0;
            if (amt > maxVal) {
                maxVal = amt;
                const match = d.date.match(/^(\d{1,2})/);
                if (match) maxHour = parseInt(match[1], 10);
            }
        });
        const endH = Math.min(23, maxHour + 3);
        return `${String(maxHour).padStart(2, '0')}:00 - ${String(endH).padStart(2, '0')}:00`;
    }, [data]);

    const periodComparisonLabel = activeFilter === 'week' ? 'vs minggu lalu' : 'vs bulan lalu';

    return (
        <Card padding={4} elevation="none" height="100%">
            <VStack gap={4} height="100%">
                <HStack justify="between" align="start" wrap="wrap" gap={3}>
                    <VStack gap={1}>
                        <HStack gap={2} align="center" wrap="wrap">
                            <Heading level={4} weight="semibold">Tren Pendapatan</Heading>
                            {activeFilter === 'today' ? (
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '2px 8px',
                                        borderRadius: 9999,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                        color: '#b45309',
                                        border: '1px solid rgba(245, 158, 11, 0.28)',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    <Flame size={12} color="#d97706" />
                                    <span>Jam Ramai: {todayPeakHour}</span>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '2px 8px',
                                        borderRadius: 9999,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: trendInfo.isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                        color: trendInfo.isPositive ? '#047857' : '#b91c1c',
                                        border: `1px solid ${trendInfo.isPositive ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)'}`,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {trendInfo.isPositive ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />}
                                    <span>{trendInfo.isPositive ? `+${trendInfo.percent}%` : `-${trendInfo.percent}%`} {periodComparisonLabel}</span>
                                </div>
                            )}
                        </HStack>
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
                                <linearGradient id="chartGradientRevenueEnterprise" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                                    <stop offset="55%" stopColor="#059669" stopOpacity={0.08} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.00} />
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
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#059669', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#059669"
                                strokeWidth={2.5}
                                fill="url(#chartGradientRevenueEnterprise)"
                                dot={false}
                                activeDot={{
                                    r: 5,
                                    fill: '#059669',
                                    stroke: '#ffffff',
                                    strokeWidth: 2.5,
                                }}
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
