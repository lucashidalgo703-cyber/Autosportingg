"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '../../ProtectedRoute';
import CrmShell from './CrmShell';

export default function AdminLayoutClient({ children }) {
    const pathname = usePathname();

    // Si es la ruta legacy, quizás tenga su propio layout, así que solo aplicamos ProtectedRoute
    if (pathname === '/admin/legacy') {
        return (
            <ProtectedRoute>
                {children}
            </ProtectedRoute>
        );
    }

    // Para todo el resto de /admin/* usamos el nuevo CrmShell
    return (
        <ProtectedRoute>
            <CrmShell>
                {children}
            </CrmShell>
        </ProtectedRoute>
    );
}
