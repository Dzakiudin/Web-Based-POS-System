import React from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { useMediaQuery } from '@astryxdesign/core/hooks';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
    actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    // On mobile: if there are no actions, don't render the header at all (top bar already displays page title)
    if (isMobile && !actions) {
        return null;
    }

    // On mobile: match Vouchers CTA top/bottom rhythm (4px top breathing room, 12px gap to content below inside VStack gap={4})
    if (isMobile) {
        return (
            <div
                className="pos-page-header"
                style={{
                    width: '100%',
                    paddingTop: 4,
                    marginBottom: -4,
                }}
            >
                <div
                    className="pos-page-header-actions"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'stretch',
                        width: '100%',
                        minWidth: 0,
                    }}
                >
                    {actions}
                </div>
            </div>
        );
    }

    return (
        <div className="pos-page-header" style={{ width: '100%', marginBottom: 16 }}>
            <div
                className="pos-page-header-inner"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    paddingBottom: 16,
                    borderBottom: '1px solid rgba(228, 228, 231, 0.8)',
                    width: '100%',
                }}
            >
                <div className="pos-page-header-title-box" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Heading level={3} weight="bold">
                            {title}
                        </Heading>
                        {badge}
                    </div>
                    {subtitle && (
                        <div className="pos-page-header-subtitle">
                            <Text size="xsm" color="secondary">
                                {subtitle}
                            </Text>
                        </div>
                    )}
                </div>

                {actions && (
                    <div
                        className="pos-page-header-actions"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                            width: 'auto',
                        }}
                    >
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
