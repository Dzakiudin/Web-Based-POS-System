import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export const getServerBaseUrl = (): string => {
    const defaultRemoteUrl = 'https://earthquaking-jen-faunlike.ngrok-free.dev';
    const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
    const targetRemoteUrl = (envBaseUrl || defaultRemoteUrl).replace(/\/+$/, '');

    // 1. If running inside native Android/iOS Capacitor app, ALWAYS use the production remote URL
    if (Capacitor.isNativePlatform()) {
        return targetRemoteUrl;
    }

    // 2. If running in a web browser:
    if (typeof window !== 'undefined') {
        const { hostname, port, origin } = window.location;
        // Remote web access (e.g. accessed through ngrok or domain)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !origin.startsWith('capacitor://')) {
            return origin;
        }
        // Local desktop browser on port 5000
        if (port === '5000') {
            return origin;
        }
    }

    return targetRemoteUrl;
};

const api = axios.create({
    baseURL: `${getServerBaseUrl()}/api`,
    timeout: 15000,
});

api.interceptors.request.use((config) => {
    config.baseURL = `${getServerBaseUrl()}/api`;
    if (config.headers && typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('ngrok-skip-browser-warning', 'true');
    } else {
        config.headers['ngrok-skip-browser-warning'] = 'true';
    }
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pos:server-online'));
    }
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login?reason=expired';
        }
    } else if (!error.response) {
        // Network error or timeout — notify UI connection indicator
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pos:server-offline'));
        }
        if (error.code === 'ECONNABORTED') {
            error.message = 'Koneksi ke server timeout (lebih dari 15 detik). Periksa jaringan toko.';
        } else {
            error.message = 'Tidak dapat terhubung ke server POS. Pastikan server toko menyala dan terhubung ke internet.';
        }
    }
    return Promise.reject(error);
});

export default api;
