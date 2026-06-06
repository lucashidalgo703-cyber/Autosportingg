import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

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
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken && isTokenValid(storedToken)) {
            setToken(storedToken);
            setIsAuthenticated(true);
            setUser(decodeToken(storedToken));
        } else if (storedToken) {
            localStorage.removeItem('token');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const handleAuthExpired = () => {
            clearSession();
        };

        window.addEventListener('autosporting-auth-expired', handleAuthExpired);
        return () => window.removeEventListener('autosporting-auth-expired', handleAuthExpired);
    }, [clearSession]);

    const login = (token) => {
        if (!token || !isTokenValid(token)) {
            clearSession();
            return;
        }

        localStorage.setItem('token', token);
        setToken(token);
        setIsAuthenticated(true);
        setUser(decodeToken(token));
    };

    const logout = () => {
        clearSession();
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
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading, token, getToken, validateSession }}>
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
