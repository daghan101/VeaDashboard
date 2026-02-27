import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS, ROUTES, EVENTS } from '../constants';

// Memory Cache - Her istekte localstorage okuma gecikmesini (I/O thread block) engeller
let cachedToken: string | null = null;
const isBrowser = typeof window !== 'undefined';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 1. SSR Koruması ve Performans Optimizasyonu
    if (isBrowser) {
        if (!cachedToken) {
            try {
                cachedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            } catch (e) {
                console.warn('LocalStorage erişim hatası', e);
            }
        }

        if (cachedToken) {
            config.headers.Authorization = `Bearer ${cachedToken}`;
        }
    }
    return config;
});

// Race condition (Aynı anda atılan çoklu hatalı isteklerde çoklu işlem/yönlendirme yapmayı) önleyici bayrak
let isNavigatingToLogin = false;

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // 2. Güvenli Yönlendirme ve SPA Event Gönderimi
        if (error.response?.status === 401 && isBrowser) {
            cachedToken = null; // Memory cache'i temizle

            if (!isNavigatingToLogin && window.location.pathname !== ROUTES.LOGIN) {
                isNavigatingToLogin = true;

                try {
                    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
                    localStorage.removeItem(STORAGE_KEYS.USER);
                } catch (e) {
                    console.warn('LocalStorage silme hatası', e);
                }

                // Tam sayfa (hard-refresh) yerine SPA mekanizmasını tetikle
                const authEvent = new CustomEvent(EVENTS.AUTH_ERROR);
                window.dispatchEvent(authEvent);

                // Event loop'un çalışmasına izin verdikten sonra flag'i geri aç
                setTimeout(() => {
                    isNavigatingToLogin = false;
                }, 1000);
            }
        }
        return Promise.reject(error);
    }
);

// Login sonrası token set edildiğinde memory cache'i de tetiklemek için temiz yardımcı fonksiyon
export const setApiToken = (token: string | null) => {
    cachedToken = token;
    if (isBrowser) {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        }
    }
};

export default api;
