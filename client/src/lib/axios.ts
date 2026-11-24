import axios from 'axios';

export const getServerBaseUrl = (): string => {
    // 1. If running in a standard browser on the local PC (port 5000) or remote domain, follow active origin
    if (typeof window !== 'undefined') {
        const { hostname, port, origin } = window.location;
        // Remote web access
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !origin.startsWith('capacitor://')) {
            return origin;
        }
        // Local desktop browser on port 5000
        if (port === '5000') {
            return origin;
        }
    }

    // 2. In native Android APK (Capacitor webview), connect to the permanent production domain
    const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
    if (envBaseUrl) {
        return envBaseUrl.replace(/\/+$/, '');
    }

    return 'https://earthquaking-jen-faunlike.ngrok-free.dev';
};

const api = axios.create({
    baseURL: `${getServerBaseUrl()}/api`,
    timeout: 15000,
});

api.interceptors.request.use((config) => {
    config.baseURL = `${getServerBaseUrl()}/api`;
    config.headers['ngrok-skip-browser-warning'] = 'true';
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
