"use client";
import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission } from '../../../utils/adminPermissions';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function PermissionGuard({ permission, children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="p-8 text-center text-neutral-400">Verificando accesos...</div>;
    }

    if (!hasPermission(user, permission)) {
        return (
            <div className="p-8 max-w-2xl mx-auto mt-10">
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                        <p className="text-sm text-red-400 mb-6">No tenés permisos para acceder a este módulo del CRM.</p>
                        <Link 
                            href="/admin"
                            className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                            Volver al Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
