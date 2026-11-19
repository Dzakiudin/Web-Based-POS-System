import axios from 'axios';

export const getServerBaseUrl = (): string => {
    const saved = localStorage.getItem('pos_server_url');
    if (saved) {
        return saved.replace(/\/+$/, '');
    }
    // If running in browser and not on localhost:5173
    if (typeof window !== 'undefined') {
        const { hostname, port, protocol } = window.location;
        // In mobile browser accessing server via LAN IP (e.g. 192.168.1.100:5000)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && port !== '5173') {
            return `${protocol}//${hostname}:${port || '5000'}`;
        }
    }
    return 'http://localhost:5000';
};

const api = axios.create({
    baseURL: `${getServerBaseUrl()}/api`,
});

api.interceptors.request.use((config) => {
    config.baseURL = `${getServerBaseUrl()}/api`;
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});

export default api;
