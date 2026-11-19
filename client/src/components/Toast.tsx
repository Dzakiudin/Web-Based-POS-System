import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const removeToast = useCallback((id: string) => {
        clearTimeout(timerRefs.current[id]);
        delete timerRefs.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
        timerRefs.current[id] = setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

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
            {toasts.length > 0 && (
                <VStack
                    gap={2}
                    style={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        zIndex: 9999,
                        width: 'min(360px, calc(100vw - 32px))',
                        pointerEvents: 'none',
                    }}
                >
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
        </ToastContext.Provider>
    );
};
