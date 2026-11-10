"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '../../ProtectedRoute';
import CrmShell from './CrmShell';
import HelpTour from '../help/HelpTour';

export default function AdminLayoutClient({ children }) {
    const pathname = usePathname();

    // Si es la ruta legacy o de imprimir, no usamos el shell
    if (pathname === '/admin/legacy' || pathname === '/admin/reportes/imprimir') {
        return (
            <ProtectedRoute>
                {children}
            </ProtectedRoute>
        );
    }

    // Para todo el resto de /admin/* usamos el nuevo CrmShell
    return (
        <ProtectedRoute>
            <style jsx global>{`
                [data-admin-shell].font-sans {
                    font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif);
                }
            `}</style>
            <CrmShell>
                {children}
            </CrmShell>
            <HelpTour />
        </ProtectedRoute>
    );
}
