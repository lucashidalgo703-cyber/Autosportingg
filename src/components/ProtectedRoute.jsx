"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, validateSession, logout, connectionError, retryAuth } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        // Si es un error temporal de conexión o infraestructura, no cerramos sesión ni redirigimos
        if (connectionError) return;

        if (!isAuthenticated || !validateSession()) {
            logout();
            router.replace('/login');
        }
    }, [isAuthenticated, loading, connectionError, logout, router, validateSession]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#070709] text-zinc-400 font-mono text-sm">
                Cargando...
            </div>
        );
    }

    if (connectionError && !isAuthenticated) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070709] p-6 text-center font-mono text-zinc-300">
                <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 shadow-2xl backdrop-blur-md">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider mb-2">
                        Error de Conexión con el Servidor
                    </h2>
                    <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                        No se pudo verificar la sesión debido a una interrupción temporal de red o indisponibilidad del servicio. Por seguridad, el acceso a las funciones administrativas permanece bloqueado hasta reestablecer la verificación.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            type="button"
                            onClick={() => retryAuth && retryAuth()}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                            Reintentar Verificación
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                logout();
                                router.replace('/login');
                            }}
                            className="px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                            Ir al Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#070709] text-zinc-400 font-mono text-sm">
                Redirigiendo a inicio de sesión...
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
