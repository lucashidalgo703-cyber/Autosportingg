import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { clearOfflineData } from '../services/offlineSyncService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const isMountedRef = useRef(true);

    const decodeToken = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    const isTokenValid = (token) => {
        if (!token || typeof token !== 'string') return false;
        const decoded = decodeToken(token);
        if (!decoded) return false;
        if (decoded.exp && decoded.exp * 1000 <= Date.now()) return false;
        return true;
    };

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

    const restoreSession = useCallback(async () => {
        const storedToken = localStorage.getItem('token');

        if (!storedToken || !isTokenValid(storedToken)) {
            if (storedToken) localStorage.removeItem('token');
            if (isMountedRef.current) {
                setIsAuthenticated(false);
                setUser(null);
                setToken(null);
                setConnectionError(false);
                setLoading(false);
            }
            return;
        }

        try {
            const response = await fetch('/api/admin/auth/me', {
                headers: { Authorization: `Bearer ${storedToken}` },
                cache: 'no-store'
            });

            // 1. Verificación positiva del servidor (Fail-closed: SOLO 200 OK con payload válido otorga acceso)
            if (response.ok) {
                const data = await response.json().catch(() => null);
                if (data && (data.ok || data.user)) {
                    if (isMountedRef.current) {
                        setToken(storedToken);
                        setIsAuthenticated(true);
                        setUser(data.user || decodeToken(storedToken));
                        setConnectionError(false);
                        setLoading(false);
                    }
                    return;
                }
            }

            // 2. Errores de autenticación/autorización: 401 Unauthorized o 403 Forbidden
            // Cubre: token fabricado (403), firma inválida (403), token expirado (403/401), sesión revocada (401)
            if (response.status === 401 || response.status === 403) {
                if (isMountedRef.current) {
                    clearSession();
                    setConnectionError(false);
                    setLoading(false);
                }
                return;
            }

            // 3. Errores temporales de conectividad / indisponibilidad de servidor (500, 502, 503, 504)
            // Política fail-closed: NO se autoriza acceso (isAuthenticated = false), pero se preserva el token válido
            if (response.status >= 500) {
                if (isMountedRef.current) {
                    setIsAuthenticated(false);
                    setUser(null);
                    setToken(storedToken);
                    setConnectionError(true);
                    setLoading(false);
                }
                return;
            }

            // 4. Fallback fail-closed para cualquier otra respuesta imprevista (400, 404, etc.)
            if (isMountedRef.current) {
                clearSession();
                setConnectionError(false);
                setLoading(false);
            }
        } catch (error) {
            // Error de red / fetch rechazado (offline, caída de DNS, conexión rechazada)
            // Política fail-closed: NO se autoriza acceso, pero se preserva el token para reintento
            console.warn('No se pudo validar la sesion contra el servidor:', error.message);
            if (isMountedRef.current) {
                setIsAuthenticated(false);
                setUser(null);
                setToken(storedToken);
                setConnectionError(true);
                setLoading(false);
            }
        }
    }, [clearSession]);

    useEffect(() => {
        isMountedRef.current = true;
        restoreSession();

        return () => {
            isMountedRef.current = false;
        };
    }, [restoreSession]);

    useEffect(() => {
        const handleAuthExpired = () => {
            clearSession();
            setConnectionError(false);
        };

        window.addEventListener('autosporting-auth-expired', handleAuthExpired);
        return () => window.removeEventListener('autosporting-auth-expired', handleAuthExpired);
    }, [clearSession]);

    const login = (token) => {
        if (!token || !isTokenValid(token)) {
            clearSession();
            return;
        }

        const decoded = decodeToken(token);
        localStorage.setItem('token', token);
        setToken(token);
        setIsAuthenticated(true);
        setUser(decoded);
        setConnectionError(false);
    };

    const logout = useCallback(() => {
        clearSession();
        setConnectionError(false);
    }, [clearSession]);

    const retryAuth = useCallback(async () => {
        setLoading(true);
        setConnectionError(false);
        await restoreSession();
    }, [restoreSession]);

    const getToken = useCallback(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            return storedToken && isTokenValid(storedToken) ? storedToken : null;
        }
        return null;
    }, []);

    const validateSession = useCallback(() => {
        const validToken = getToken();
        if (!validToken || !isAuthenticated) {
            return false;
        }
        return true;
    }, [getToken, isAuthenticated]);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            login,
            logout,
            loading,
            token,
            getToken,
            validateSession,
            connectionError,
            retryAuth
        }}>
            {!loading && children}
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
