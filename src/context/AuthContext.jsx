import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clearOfflineData } from '../services/offlineSyncService';
import { getPersistentDeviceId } from '../services/deviceSecurityService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deviceInfo, setDeviceInfo] = useState({
        deviceId: null,
        deviceName: 'Dispositivo desconocido',
        deviceStatus: 'unknown'
    });

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

    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            const currentDeviceId = getPersistentDeviceId();
            const storedToken = localStorage.getItem('token');

            if (!storedToken || !isTokenValid(storedToken)) {
                if (storedToken) localStorage.removeItem('token');
                if (!cancelled) {
                    setDeviceInfo(prev => ({ ...prev, deviceId: currentDeviceId }));
                    setLoading(false);
                }
                return;
            }

            const decoded = decodeToken(storedToken);

            try {
                const response = await fetch('/api/admin/auth/me', {
                    headers: { 
                        Authorization: `Bearer ${storedToken}`,
                        'X-Device-Id': currentDeviceId 
                    },
                    cache: 'no-store'
                });

                if (response.status === 401) {
                    const data = await response.json().catch(() => ({}));
                    if (!cancelled) {
                        clearSession();
                        if (data.code === 'SESSION_REVOKED') {
                            console.warn('La sesión ha sido revocada desde el servidor.');
                        } else if (data.code === 'DEVICE_REVOKED') {
                            console.warn('Este dispositivo ha sido revocado por el propietario.');
                        } else if (data.code === 'LEGACY_TOKEN_REJECTED') {
                            console.warn('Sesión anterior expirada: se requiere reautenticación segura.');
                        }
                        setLoading(false);
                    }
                    return;
                }
            } catch (error) {
                console.warn('No se pudo validar la sesion contra el servidor:', error.message);
            }

            if (!cancelled) {
                setToken(storedToken);
                setIsAuthenticated(true);
                setUser(decoded);
                setDeviceInfo({
                    deviceId: currentDeviceId,
                    deviceName: decoded?.deviceName || 'Dispositivo desconocido',
                    deviceStatus: decoded?.deviceStatus || 'unknown'
                });
                setLoading(false);
            }
        };

        restoreSession();

        return () => {
            cancelled = true;
        };
    }, [clearSession]);

    useEffect(() => {
        const handleAuthExpired = () => {
            clearSession();
        };

        window.addEventListener('autosporting-auth-expired', handleAuthExpired);
        return () => window.removeEventListener('autosporting-auth-expired', handleAuthExpired);
    }, [clearSession]);

    const login = (token, deviceMeta = {}) => {
        if (!token || !isTokenValid(token)) {
            clearSession();
            return;
        }

        const decoded = decodeToken(token);
        localStorage.setItem('token', token);
        setToken(token);
        setIsAuthenticated(true);
        setUser(decoded);
        setDeviceInfo({
            deviceId: deviceMeta.deviceId || decoded?.deviceId || getPersistentDeviceId(),
            deviceName: deviceMeta.deviceName || decoded?.deviceName || 'Dispositivo desconocido',
            deviceStatus: deviceMeta.deviceStatus || decoded?.deviceStatus || 'unknown'
        });
    };

    const logout = async () => {
        const currentToken = token || localStorage.getItem('token');
        const currentDeviceId = getPersistentDeviceId();
        try {
            if (currentToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                        'X-Device-Id': currentDeviceId
                    }
                }).catch(() => {});
            }
        } finally {
            clearSession();
        }
    };

    const getToken = () => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            return storedToken && isTokenValid(storedToken) ? storedToken : null;
        }
        return null;
    };

    const validateSession = () => {
        const validToken = getToken();
        if (!validToken) {
            clearSession();
            return false;
        }
        return true;
    };

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
            deviceInfo,
            setDeviceInfo
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
