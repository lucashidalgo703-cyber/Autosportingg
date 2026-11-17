"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { gestoriaDocumentTarget } from '../utils/gestoriaDocumentLink';
import { salePaymentProofTarget } from '../utils/salePaymentProofLink';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, validateSession, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated || !validateSession()) {
            logout();
            const requested = window.location.pathname + window.location.search;
            const review = salePaymentProofTarget(requested) || gestoriaDocumentTarget(requested);
            if (review) {
                window.location.replace('/login?next=' + encodeURIComponent(review));
            } else if (window.location.pathname === '/admin/gastos/rapido') {
                window.location.replace('/login?next=' + encodeURIComponent('/admin/gastos/rapido'));
            } else router.replace('/login');
        }
    }, [isAuthenticated, loading, logout, router, validateSession]);

    if (loading || !isAuthenticated) {
        return <div>Cargando...</div>;
    }

    return children;
};

export default ProtectedRoute;
