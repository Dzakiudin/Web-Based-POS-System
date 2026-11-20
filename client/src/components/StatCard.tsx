import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { useMediaQuery } from '@astryxdesign/core/hooks';

export interface StatCardTrend {
    value: number;
    isPositive: boolean;
    label?: string;
}

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    iconBg?: string;
    iconColor?: string;
    badgeLabel?: string;
    badgeVariant?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
    trend?: StatCardTrend;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    iconBg,
    iconColor,
    badgeLabel,
    badgeVariant = 'neutral',
    trend,
    onClick,
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <div
            onClick={onClick}
            className="pos-interactive-card"
            style={{
                cursor: onClick ? 'pointer' : 'default',
                height: '100%',
            }}
        >
            <Card padding={isMobile ? 3 : 4} elevation="none" height="100%">
                <VStack gap={isMobile ? 2 : 3} justify="between" height="100%">
                    {/* Header: Title + Icon + Compact Responsive Badge */}
                    <HStack justify="between" align="center" gap={1.5} width="100%">
                        <HStack gap={isMobile ? 1.5 : 2} align="center" style={{ minWidth: 0, flex: 1 }}>
                            {icon && (
                                <div
                                    style={{
                                        width: isMobile ? 30 : 36,
                                        height: isMobile ? 30 : 36,
                                        borderRadius: 10,
                                        backgroundColor: iconBg || '#f4f4f5',
                                        border: '1px solid #e4e4e7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: iconColor || '#18181b',
                                        flexShrink: 0,
                                    }}
                                >
                                    {icon}
                                </div>
                            )}
                            <Text
                                size={isMobile ? 'xsm' : 'sm'}
                                color="secondary"
                                weight="medium"
                                maxLines={1}
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                                {title}
                            </Text>
                        </HStack>
                        {badgeLabel && (
                            <div style={{ flexShrink: 0 }}>
                                <Badge variant={badgeVariant} label={badgeLabel} />
                            </div>
                        )}
                    </HStack>

                    {/* Value + Trend Pill + Subtitle */}
                    <VStack gap={1}>
                        <div
                            style={{
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: 700,
                                letterSpacing: '-0.03em',
                                lineHeight: 1.18,
                                fontVariantNumeric: 'tabular-nums',
                                color: '#09090b',
                                wordBreak: 'break-word',
                            }}
                        >
                            {value}
                        </div>

                        {trend && (
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: trend.isPositive ? '#065f46' : '#991b1b',
                                    backgroundColor: trend.isPositive ? '#ecfdf5' : '#fef2f2',
                                    border: `1px solid ${trend.isPositive ? '#a7f3d0' : '#fecaca'}`,
                                    padding: '1.5px 6px',
                                    borderRadius: 6,
                                    width: 'fit-content',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                <span>{trend.isPositive ? '▲' : '▼'}</span>
                                <span>{Math.abs(trend.value)}%</span>
                                {trend.label && (
                                    <span style={{ fontWeight: 500, color: trend.isPositive ? '#047857' : '#b91c1c' }}>
                                        {trend.label}
                                    </span>
                                )}
                            </div>
                        )}

                        {subtitle && (
                            <Text size="xsm" color="secondary" maxLines={1}>
                                {subtitle}
                            </Text>
                        )}
                    </VStack>
                </VStack>
            </Card>
        </div>
    );
};

export default StatCard;
