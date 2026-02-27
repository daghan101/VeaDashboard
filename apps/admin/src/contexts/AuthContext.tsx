import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api, { setApiToken } from '../services/api';
import { STORAGE_KEYS, EVENTS } from '../constants';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    canSeeRestricted: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Yardımcı fonksiyon: JWT token süresinin dolup dolmadığını kontrol eder
const isTokenExpired = (token: string): boolean => {
    try {
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64);
        const decoded = JSON.parse(decodedJson);
        const exp = decoded.exp;

        if (!exp) return false;

        // saniye bazlı olan exp'yi milisaniyeye çevirip mevcut zamanla kıyaslarız
        return Date.now() >= exp * 1000;
    } catch (e) {
        // Parse edilemiyorsa geçersiz veya süresi dolmuş kabul edelim
        return true;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
        } catch (e) {
            console.warn('LocalStorage temizleme hatası', e);
        }
        setApiToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgisini al ve validation yap
        try {
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
            const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

            if (storedUser && storedToken && !isTokenExpired(storedToken)) {
                setUser(JSON.parse(storedUser));
                setApiToken(storedToken); // Memory'ye de bildir
            } else if (storedToken) {
                // Token var ama süresi dolmuş veya hatalı
                logout();
            }
        } catch (e) {
            console.error('Kullanıcı session parse edilemedi veya storage patladı', e);
            logout(); // Veri bozulmuşsa oturumu zorunlu kapat
        } finally {
            setLoading(false);
        }

        // api.ts den gelen 401 yetkisiz erişim SPA yönlendirme eventi
        const handleAuthError = () => {
            // Sadece state'i null yapmak yeterlidir, alt bileşenler (PrivateRoute vs) yönlendirmeyi halleder
            setUser(null);
        };

        window.addEventListener(EVENTS.AUTH_ERROR, handleAuthError);

        return () => {
            window.removeEventListener(EVENTS.AUTH_ERROR, handleAuthError);
        };
    }, [logout]);

    const login = async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = response.data;

        try {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            setApiToken(access_token);
            setUser(userData);
        } catch (e) {
            console.error('Login cache işlemi başarısız', e);
            // Memory ile devam edilebilir ancak refresh sorunu olacaktır.
            setApiToken(access_token);
            setUser(userData);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
