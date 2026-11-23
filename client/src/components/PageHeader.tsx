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

    return (
        <div className="pos-page-header" style={{ width: '100%', marginBottom: isMobile ? (actions ? 8 : 0) : 16 }}>
            <div
                className="pos-page-header-inner"
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? 8 : 16,
                    paddingBottom: isMobile ? 0 : 16,
                    borderBottom: isMobile ? 'none' : '1px solid rgba(228, 228, 231, 0.8)',
                    width: '100%',
                }}
            >
                {/* Title & Subtitle: Completely hidden on mobile (TopAppBar already shows active page name) */}
                {!isMobile && (
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
                )}

                {/* Actions: on desktop aligned right, on mobile full width if present */}
                {actions && (
                    <div
                        className="pos-page-header-actions"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                            justifyContent: isMobile ? 'stretch' : 'flex-end',
                            width: isMobile ? '100%' : 'auto',
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
