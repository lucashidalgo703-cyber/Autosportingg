"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { gestoriaDocumentTarget } from '../utils/gestoriaDocumentLink';
import { salePaymentProofTarget } from '../utils/salePaymentProofLink';
import { issueReportTarget } from '../utils/issueReportLink';
import { canAccessCrmPath, crmHomeFor } from '../utils/adminPermissions';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, validateSession, logout, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const canAccess = Boolean(user && pathname && canAccessCrmPath(user, pathname));
    const home = crmHomeFor(user);

    useEffect(() => {
        if (loading || !pathname) return;

        if (!isAuthenticated || !validateSession()) {
            logout();
            const requested = window.location.pathname + window.location.search;
            const review = issueReportTarget(requested) || salePaymentProofTarget(requested) || gestoriaDocumentTarget(requested);
            if (review) {
                window.location.replace('/login?next=' + encodeURIComponent(review));
            } else if (window.location.pathname === '/admin/gastos/rapido') {
                window.location.replace('/login?next=' + encodeURIComponent('/admin/gastos/rapido'));
            } else router.replace('/login');
        } else if (!canAccess) {
            router.replace(home);
        }
    }, [isAuthenticated, loading, logout, router, validateSession, pathname, canAccess, home]);

    if (loading || !isAuthenticated) {
        return <div>Cargando...</div>;
    }
    if (!canAccess) return <div role="status">Redirigiendo...</div>;

    return children;
};

export default ProtectedRoute;
