"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '../../ProtectedRoute';
import CrmShell from './CrmShell';

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
            <CrmShell>
                {children}
            </CrmShell>
        </ProtectedRoute>
    );
}
