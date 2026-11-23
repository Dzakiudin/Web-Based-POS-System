import api, { getServerBaseUrl } from './axios';

export interface PaymentAccount {
    bank: string;
    accountNumber: string;
    accountName: string;
}

export interface StoreSettings {
    appName: string;
    storeName: string;
    address: string;
    phone: string;
    footerLine1: string;
    footerLine2: string;
    paperWidth: '58mm' | '80mm';
    logoUrl: string | null;
    qrisImageUrl: string | null;
    paymentAccounts: PaymentAccount[];
    requireOpenShift: boolean;
    taxRate: number;
    serviceChargeRate: number;
}

const STORAGE_KEY = 'pos_store_settings_v2';

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccount[] = [
    { bank: 'BCA', accountNumber: '8830192831', accountName: 'POS Store Official' },
    { bank: 'Mandiri', accountNumber: '137001928312', accountName: 'POS Store Official' },
    { bank: 'GoPay / OVO / Dana', accountNumber: '081234567890', accountName: 'POS Store' },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
    appName: 'POS System',
    storeName: 'POS SYSTEM STORE',
    address: 'Jl. Jendral Sudirman Kav. 52, Jakarta',
    phone: '(021) 5299-1000',
    footerLine1: 'Terima kasih atas kunjungan Anda!',
    footerLine2: 'Barang yang dibeli tidak dapat ditukar',
    paperWidth: '80mm',
    logoUrl: null,
    qrisImageUrl: null,
    paymentAccounts: DEFAULT_PAYMENT_ACCOUNTS,
    requireOpenShift: false,
    taxRate: 0,
    serviceChargeRate: 0,
};

export const resolveUploadUrl = (url?: string | null): string | null => {
    if (!url || !url.trim()) return null;
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    const base = getServerBaseUrl();
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
};

const normalizeSettings = (raw: any, fallback: StoreSettings = DEFAULT_STORE_SETTINGS): StoreSettings => {
    const accounts: PaymentAccount[] = Array.isArray(raw?.paymentAccounts)
        ? raw.paymentAccounts
              .filter((a: any) => a && typeof a.bank === 'string' && typeof a.accountNumber === 'string')
              .map((a: any) => ({
                  bank: a.bank,
                  accountNumber: a.accountNumber,
                  accountName: typeof a.accountName === 'string' ? a.accountName : '',
              }))
        : fallback.paymentAccounts;

    return {
        appName: typeof raw?.appName === 'string' && raw.appName.trim() ? raw.appName : fallback.appName,
        storeName: typeof raw?.storeName === 'string' && raw.storeName.trim() ? raw.storeName : fallback.storeName,
        address: typeof raw?.address === 'string' ? raw.address : fallback.address,
        phone: typeof raw?.phone === 'string' ? raw.phone : fallback.phone,
        footerLine1: typeof raw?.footerLine1 === 'string' ? raw.footerLine1 : fallback.footerLine1,
        footerLine2: typeof raw?.footerLine2 === 'string' ? raw.footerLine2 : fallback.footerLine2,
        paperWidth: raw?.paperWidth === '58mm' ? '58mm' : '80mm',
        logoUrl: typeof raw?.logoUrl === 'string' && raw.logoUrl.trim() ? raw.logoUrl : null,
        qrisImageUrl: typeof raw?.qrisImageUrl === 'string' && raw.qrisImageUrl.trim() ? raw.qrisImageUrl : null,
        paymentAccounts: accounts,
        requireOpenShift: Boolean(raw?.requireOpenShift),
        taxRate: Number.isFinite(Number(raw?.taxRate)) ? Math.max(0, Math.min(100, Number(raw.taxRate))) : 0,
        serviceChargeRate: Number.isFinite(Number(raw?.serviceChargeRate))
            ? Math.max(0, Math.min(100, Number(raw.serviceChargeRate)))
            : 0,
    };
};

export const getCachedStoreSettings = (): StoreSettings => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_STORE_SETTINGS;
        return normalizeSettings(JSON.parse(raw), DEFAULT_STORE_SETTINGS);
    } catch {
        return DEFAULT_STORE_SETTINGS;
    }
};

export const saveCachedStoreSettings = (settings: StoreSettings): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Ignore storage quota errors
    }
};

export const fetchPublicSettings = async (): Promise<StoreSettings> => {
    const cached = getCachedStoreSettings();
    try {
        const r = await api.get('/settings/public');
        const merged = normalizeSettings(
            {
                ...cached,
                appName: r.data?.appName ?? cached.appName,
                storeName: r.data?.storeName ?? cached.storeName,
                logoUrl: r.data?.logoUrl !== undefined ? r.data.logoUrl : cached.logoUrl,
            },
            cached
        );
        saveCachedStoreSettings(merged);
        return merged;
    } catch {
        return cached;
    }
};

export const fetchAndSyncStoreSettings = async (): Promise<StoreSettings> => {
    const cached = getCachedStoreSettings();
    try {
        const r = await api.get('/settings/store');
        const synced = normalizeSettings(r.data, cached);
        saveCachedStoreSettings(synced);
        return synced;
    } catch {
        return cached;
    }
};

export const updateStoreSettingsApi = async (settings: StoreSettings): Promise<StoreSettings> => {
    const r = await api.put('/settings/store', {
        appName: settings.appName,
        storeName: settings.storeName,
        address: settings.address,
        phone: settings.phone,
        footerLine1: settings.footerLine1,
        footerLine2: settings.footerLine2,
        paperWidth: settings.paperWidth,
        paymentAccounts: settings.paymentAccounts,
        requireOpenShift: settings.requireOpenShift,
        taxRate: settings.taxRate,
        serviceChargeRate: settings.serviceChargeRate,
    });
    const saved = normalizeSettings(r.data, settings);
    saveCachedStoreSettings(saved);
    return saved;
};

export const uploadSettingImageApi = async (kind: 'qris' | 'logo', file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const r = await api.post(`/settings/upload/${kind}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data.url as string;
};

export const deleteSettingImageApi = async (kind: 'qris' | 'logo'): Promise<void> => {
    await api.delete(`/settings/upload/${kind}`);
};
