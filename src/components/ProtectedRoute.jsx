"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, validateSession, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated || !validateSession()) {
            logout();
            router.replace('/login');
        }
    }, [isAuthenticated, loading, logout, router, validateSession]);

    if (loading || !isAuthenticated) {
        return <div>Cargando...</div>;
    }

    return children;
};

export default ProtectedRoute;
