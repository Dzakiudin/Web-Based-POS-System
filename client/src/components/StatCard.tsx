import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { useMediaQuery } from '@astryxdesign/core/hooks';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    iconBg?: string;
    iconColor?: string;
    badgeLabel?: string;
    badgeVariant?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
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
                    <HStack justify="between" align="center" gap={2}>
                        <HStack gap={2} align="center" style={{ minWidth: 0 }}>
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
                            <Text size="sm" color="secondary" weight="medium" maxLines={1}>
                                {title}
                            </Text>
                        </HStack>
                        {badgeLabel && (
                            <Badge variant={badgeVariant} label={badgeLabel} />
                        )}
                    </HStack>

                    <VStack gap={0.5}>
                        <div
                            style={{
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: 700,
                                letterSpacing: '-0.025em',
                                lineHeight: 1.2,
                                fontVariantNumeric: 'tabular-nums',
                                color: '#09090b',
                                wordBreak: 'break-word',
                            }}
                        >
                            {value}
                        </div>
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
