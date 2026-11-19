import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ShoppingCart,
    LayoutDashboard,
    ReceiptText,
    Warehouse,
    Grid2X2,
} from 'lucide-react';

interface BottomNavBarProps {
    onOpenMenu: () => void;
    cartCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ onOpenMenu, cartCount = 0 }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const tabs = [
        {
            key: 'transactions',
            path: '/transactions',
            label: 'Kasir',
            icon: ShoppingCart,
            badge: cartCount > 0 ? cartCount : undefined,
        },
        {
            key: 'dashboard',
            path: '/dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
        },
        {
            key: 'history',
            path: '/transaction-history',
            label: 'Riwayat',
            icon: ReceiptText,
        },
        {
            key: 'inventory',
            path: '/inventory',
            label: 'Stok',
            icon: Warehouse,
        },
        {
            key: 'menu',
            action: 'menu',
            label: 'Menu',
            icon: Grid2X2,
        },
    ];

    const isCurrentActive = (tab: typeof tabs[0]) => {
        if (tab.action === 'menu') {
            // Active if we are on any other nested page not in the main 4 tabs
            const primaryPaths = ['/transactions', '/dashboard', '/transaction-history', '/inventory'];
            return !primaryPaths.includes(location.pathname);
        }
        return location.pathname === tab.path;
    };

    const handleTabClick = (tab: typeof tabs[0]) => {
        if (tab.action === 'menu') {
            onOpenMenu();
        } else if (tab.path) {
            if (location.pathname === tab.path) return;
            if ('startViewTransition' in document) {
                (document as any).startViewTransition(() => {
                    navigate(tab.path!);
                });
            } else {
                navigate(tab.path);
            }
        }
    };

    return (
        <nav
            aria-label="Navigasi bawah mobile"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 45,
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid #e4e4e7',
                paddingTop: 6,
                paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
                paddingLeft: 8,
                paddingRight: 8,
                boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                userSelect: 'none',
            }}
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = isCurrentActive(tab);

                return (
                    <button
                        key={tab.key}
                        type="button"
                        className="pos-tap-active"
                        onClick={() => handleTabClick(tab)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            minWidth: 0,
                            padding: '4px 2px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            position: 'relative',
                            color: active ? '#18181b' : '#71717a',
                            transition: 'color 180ms ease, transform 120ms ease',
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                padding: '4px 14px',
                                borderRadius: 16,
                                backgroundColor: active ? 'rgba(24, 24, 27, 0.07)' : 'transparent',
                                transform: active ? 'scale(1.06)' : 'scale(1)',
                                transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                        >
                            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} color={active ? '#09090b' : '#71717a'} />
                            {tab.badge !== undefined && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 8,
                                        minWidth: 16,
                                        height: 16,
                                        borderRadius: 8,
                                        backgroundColor: '#18181b',
                                        color: '#ffffff',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </div>
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: active ? 700 : 500,
                                marginTop: 2,
                                color: active ? '#09090b' : '#71717a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                transition: 'all 180ms ease',
                            }}
                        >
                            {tab.label}
                        </span>
                        {active && (
                            <span
                                style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    backgroundColor: '#18181b',
                                    marginTop: 2,
                                    animation: 'posDotPop 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNavBar;
