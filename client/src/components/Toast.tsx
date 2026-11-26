import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { VStack } from '@astryxdesign/core/VStack';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

type PopoverDiv = HTMLDivElement & {
    showPopover?: () => void;
    hidePopover?: () => void;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const popoverRef = useRef<PopoverDiv | null>(null);

    const removeToast = useCallback((id: string) => {
        clearTimeout(timerRefs.current[id]);
        delete timerRefs.current[id];
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (message: string, type: ToastType = 'info') => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
            timerRefs.current[id] = setTimeout(() => removeToast(id), 4500);
        },
        [removeToast]
    );

    // Promote Toast container into browser Top Layer (Popover API) whenever toasts update,
    // so notifications ALWAYS appear ABOVE native <dialog>.showModal() modals.
    useEffect(() => {
        const el = popoverRef.current;
        if (!el || typeof el.showPopover !== 'function') return;
        try {
            if (toasts.length > 0) {
                if (el.matches(':popover-open')) {
                    el.hidePopover?.();
                }
                el.showPopover();
            } else if (el.matches(':popover-open')) {
                el.hidePopover?.();
            }
        } catch {
            // Fallback to fixed z-index on older WebViews without Popover API
        }
    }, [toasts]);

    const value: ToastContextType = {
        toast: addToast,
        success: (m) => addToast(m, 'success'),
        error: (m) => addToast(m, 'error'),
        warning: (m) => addToast(m, 'warning'),
        info: (m) => addToast(m, 'info'),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                ref={popoverRef}
                popover="manual"
                className="pos-toast-popover"
                style={{
                    position: 'fixed',
                    inset: 'unset',
                    top: 'max(16px, env(safe-area-inset-top))',
                    right: 16,
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    overflow: 'visible',
                    zIndex: 2147483647,
                    width: 'min(360px, calc(100vw - 32px))',
                    pointerEvents: 'none',
                    display: toasts.length > 0 ? 'block' : 'none',
                }}
            >
                {toasts.length > 0 && (
                    <VStack gap={2} style={{ pointerEvents: 'none' }}>
                        {toasts.map((t) => (
                            <VStack key={t.id} style={{ pointerEvents: 'auto' }}>
                                <Banner
                                    status={t.type}
                                    title={t.message}
                                    container="card"
                                    elevation="med"
                                    isDismissable
                                    onDismiss={() => removeToast(t.id)}
                                />
                            </VStack>
                        ))}
                    </VStack>
                )}
            </div>
        </ToastContext.Provider>
    );
};
