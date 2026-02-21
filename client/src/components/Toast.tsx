import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
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

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: any }> = {
    success: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/30', icon: CheckCircle2 },
    error: { bg: 'from-red-500/10 to-red-500/5', border: 'border-red-500/30', icon: XCircle },
    warning: { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/30', icon: AlertTriangle },
    info: { bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/30', icon: Info },
};

const TOAST_TEXT_COLORS: Record<ToastType, string> = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
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
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
                {toasts.map((t) => {
                    const style = TOAST_STYLES[t.type];
                    const Icon = style.icon;
                    return (
                        <div
                            key={t.id}
                            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${style.bg} border ${style.border} backdrop-blur-xl shadow-2xl animate-in slide-in-from-right fade-in duration-300`}
                        >
                            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${TOAST_TEXT_COLORS[t.type]}`} />
                            <p className="text-white/80 text-sm flex-1 font-medium">{t.message}</p>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};
