import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function ConfigSkeleton() {
    return (
        <div className="space-y-6 animate-pulse w-full max-w-4xl">
            <div className="h-8 bg-crm-surface border border-crm-border rounded-lg w-1/3 mb-6"></div>
            <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 space-y-6">
                <div className="h-6 bg-crm-bg rounded-lg w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 bg-crm-bg rounded-lg w-1/3"></div>
                            <div className="h-11 bg-crm-bg rounded-xl w-full"></div>
                        </div>
                    ))}
                </div>
                <div className="pt-4 flex justify-end">
                    <div className="h-10 bg-crm-bg rounded-xl w-32"></div>
                </div>
            </div>
        </div>
    );
}

export function ConfigError({ error, onRetry }) {
    return (
        <div className="bg-crm-surface border border-crm-border rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 my-8">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldAlert size={32} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">Error al cargar configuración</h3>
                <p className="text-sm text-crm-fg-muted mt-2">{error}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-4 bg-crm-red-gradient text-white font-black px-8 py-2.5 rounded-xl text-sm shadow-crm-shadow-red hover:opacity-90 transition-opacity"
                >
                    Reintentar
                </button>
            )}
        </div>
    );
}
