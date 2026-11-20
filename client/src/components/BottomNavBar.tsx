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
            key: 'transactions',
            path: '/transactions',
            label: 'Kasir',
            icon: ShoppingCart,
            badge: cartCount > 0 ? cartCount : undefined,
            isHero: true,
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
            navigate(tab.path);
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
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(228, 228, 231, 0.85)',
                paddingTop: 6,
                paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
                paddingLeft: 8,
                paddingRight: 8,
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                userSelect: 'none',
            }}
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = isCurrentActive(tab);
                const isHero = tab.isHero;

                // Elevated Hero Action Pill untuk 'Kasir' (Square / Toast standard)
                if (isHero) {
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
                                flex: 1.2,
                                minWidth: 0,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                outline: 'none',
                                position: 'relative',
                                marginTop: -14,
                                paddingBottom: 2,
                            }}
                        >
                            <div
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    background: active
                                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                        : 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                                    color: '#ffffff',
                                    border: active ? '2px solid #a7f3d0' : '1px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: active
                                        ? '0 8px 18px -2px rgba(5, 150, 105, 0.45), 0 3px 6px -2px rgba(5, 150, 105, 0.3)'
                                        : '0 8px 18px -2px rgba(24, 24, 27, 0.38), 0 3px 6px -2px rgba(24, 24, 27, 0.2)',
                                    transform: active ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                                }}
                            >
                                <Icon size={21} strokeWidth={2.4} color="#ffffff" />
                                {tab.badge !== undefined && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: -2,
                                            right: -2,
                                            minWidth: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            backgroundColor: '#ef4444',
                                            color: '#ffffff',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '0 4px',
                                            border: '2px solid #ffffff',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        }}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: active ? 700 : 600,
                                    marginTop: 3,
                                    color: active ? '#059669' : '#18181b',
                                    whiteSpace: 'nowrap',
                                    letterSpacing: '-0.01em',
                                    transition: 'all 180ms ease',
                                }}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                }

                // Regular Tab Items
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
                                padding: '4px 12px',
                                borderRadius: 14,
                                backgroundColor: active ? 'rgba(24, 24, 27, 0.06)' : 'transparent',
                                transform: active ? 'scale(1.06)' : 'scale(1)',
                                transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                        >
                            <Icon size={19} strokeWidth={active ? 2.4 : 1.8} color={active ? '#09090b' : '#71717a'} />
                        </div>
                        <span
                            style={{
                                fontSize: 10.5,
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
