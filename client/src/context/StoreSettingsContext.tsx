import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getCachedStoreSettings,
    saveCachedStoreSettings,
    fetchPublicSettings,
    fetchAndSyncStoreSettings,
    type StoreSettings,
} from '../lib/storeSettings';
import { useAuth } from './AuthContext';

interface StoreSettingsContextType {
    settings: StoreSettings;
    setSettings: (next: StoreSettings) => void;
    refreshSettings: () => Promise<StoreSettings>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | null>(null);

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [settings, setSettingsState] = useState<StoreSettings>(() => getCachedStoreSettings());

    const setSettings = useCallback((next: StoreSettings) => {
        saveCachedStoreSettings(next);
        setSettingsState(next);
    }, []);

    const refreshSettings = useCallback(async () => {
        const synced = isAuthenticated
            ? await fetchAndSyncStoreSettings()
            : await fetchPublicSettings();
        setSettingsState(synced);
        return synced;
    }, [isAuthenticated]);

    // Sync public branding on first load (Login screen) and full settings once authenticated
    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    // Keep browser tab title globally synced whenever appName changes
    useEffect(() => {
        if (settings.appName) {
            document.title = `${settings.appName} - Kasir & Manajemen Ritel`;
        }
    }, [settings.appName]);

    return (
        <StoreSettingsContext.Provider value={{ settings, setSettings, refreshSettings }}>
            {children}
        </StoreSettingsContext.Provider>
    );
};

export const useStoreSettings = () => {
    const ctx = useContext(StoreSettingsContext);
    if (!ctx) {
        throw new Error('useStoreSettings must be used within StoreSettingsProvider');
    }
    return ctx;
};
