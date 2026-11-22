import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clearOfflineData } from '../services/offlineSyncService';

const AuthContext = createContext(null);

const decodeToken = (token) => {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(payload);
    } catch {
        return null;
    }
};

const isTokenValid = (token) => {
    const decoded = decodeToken(token);
    return Boolean(decoded?.type === 'session' && decoded.emailVerified === true &&
        Number.isFinite(decoded.exp) && decoded.exp * 1000 > Date.now());
};

const authBaseUrl = () => process.env.NODE_ENV === 'production' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = useCallback(() => {
        try {
            const stored = localStorage.getItem('token');
            const decoded = stored ? decodeToken(stored) : null;
            const currentUserId = decoded?.id || decoded?._id || decoded?.username;
            if (currentUserId) clearOfflineData(currentUserId);
        } catch {}
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const restoreSession = async () => {
            const storedToken = localStorage.getItem('token');
            if (!storedToken || !isTokenValid(storedToken)) {
                if (!cancelled) {
                    clearSession();
                    setLoading(false);
                }
                return;
            }

            // Restauración inmediata desde claims válidos locales para evitar parpadeos
            const claims = decodeToken(storedToken);
            if (claims && isTokenValid(storedToken)) {
                setToken(storedToken);
                setIsAuthenticated(true);
                setUser({ ...claims, id: claims.id, userId: claims.id });
            }

            try {
                const response = await fetch(authBaseUrl() + '/api/admin/auth/me', {
                    headers: { Authorization: 'Bearer ' + storedToken },
                    cache: 'no-store',
                    signal: controller.signal
                });

                // Solo el código HTTP 401 indica revocación real o sesión expirada en servidor
                if (response.status === 401) {
                    if (!cancelled) clearSession();
                    return;
                }

                // Si hubo error de red o servidor temporal (5xx), preservamos la sesión local válida
                if (!response.ok) {
                    return;
                }

                const session = await response.json();
                const currentUser = session?.user;
                if (session?.ok === true && currentUser && currentUser.id === claims?.id
                    && typeof currentUser.role === 'string' && Array.isArray(currentUser.permissions)) {
                    if (!cancelled && localStorage.getItem('token') === storedToken && isTokenValid(storedToken)) {
                        setUser({
                            ...claims,
                            id: claims.id,
                            userId: claims.id,
                            role: currentUser.role,
                            permissions: currentUser.permissions,
                            username: currentUser.username,
                            email: currentUser.email
                        });
                    }
                }
            } catch {
                // Si la red falló momentáneamente o la máquina se despertó de suspensión,
                // NO destruimos la sesión si el token aún no venció cronológicamente
                if (!cancelled && (!claims || !isTokenValid(storedToken))) {
                    clearSession();
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        restoreSession();
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [clearSession]);

    useEffect(() => {
        if (!token) return;
        const decoded = decodeToken(token);
        if (!decoded?.exp) return;
        const remaining = decoded.exp * 1000 - Date.now();
        if (!Number.isFinite(remaining) || remaining <= 0) {
            clearSession();
            return;
        }
        // Cap timer a máximo 12 horas para prevenir desbordamiento de enteros de 32 bits en setTimeout
        // (si el delay supera 2147483647 ms, el estándar JS lo convierte a 0 y ejecuta de inmediato)
        const safeDelay = Math.min(remaining, 12 * 60 * 60 * 1000);
        const timer = setTimeout(() => {
            if (Date.now() >= decoded.exp * 1000) {
                clearSession();
            } else {
                // El token sigue vigente; re-evaluar timer de forma segura
                setToken(t => (t ? `${t}` : null));
            }
        }, safeDelay);
        return () => clearTimeout(timer);
    }, [token, clearSession]);

    useEffect(() => {
        const handleAuthExpired = () => clearSession();
        const handleStorage = (event) => {
            if (event.key !== 'token' || event.newValue === event.oldValue) return;
            if (event.newValue === null) clearSession();
            else window.location.reload();
        };
        window.addEventListener('autosporting-auth-expired', handleAuthExpired);
        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('autosporting-auth-expired', handleAuthExpired);
            window.removeEventListener('storage', handleStorage);
        };
    }, [clearSession]);

    const login = useCallback((sessionToken) => {
        if (!sessionToken || !isTokenValid(sessionToken)) {
            clearSession();
            return false;
        }
        localStorage.setItem('token', sessionToken);
        setToken(sessionToken);
        setIsAuthenticated(true);
        setUser(decodeToken(sessionToken));
        return true;
    }, [clearSession]);

    const logout = useCallback(() => {
        const storedToken = localStorage.getItem('token');
        clearSession();
        if (storedToken && isTokenValid(storedToken)) {
            void fetch(authBaseUrl() + '/api/logout', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + storedToken },
                keepalive: true
            }).catch(() => {});
        }
    }, [clearSession]);

    const getToken = useCallback(() => {
        if (typeof window === 'undefined') return null;
        const storedToken = localStorage.getItem('token');
        return storedToken && isTokenValid(storedToken) ? storedToken : null;
    }, []);

    const validateSession = useCallback(() => {
        if (!getToken()) {
            clearSession();
            return false;
        }
        return true;
    }, [getToken, clearSession]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading, token, getToken, validateSession }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
