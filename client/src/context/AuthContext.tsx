import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
    id: number;
    name: string;
    username?: string;
    role: string;
    permissions: string[];
}

interface AuthContextType {
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    // Auto-logout after 30 minutes of inactivity (security hardening for cashier workstations)
    useEffect(() => {
        if (!user) return;

        let idleTimer: ReturnType<typeof setTimeout>;
        const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                logout();
                window.location.href = '/login?reason=idle';
            }, INACTIVITY_LIMIT_MS);
        };

        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach((evt) => {
            window.addEventListener(evt, resetIdleTimer, { passive: true });
        });
        resetIdleTimer();

        return () => {
            clearTimeout(idleTimer);
            activityEvents.forEach((evt) => {
                window.removeEventListener(evt, resetIdleTimer);
            });
        };
    }, [user]);

    const login = (token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
