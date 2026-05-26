import React from 'react';
import { Target, AlertCircle } from 'lucide-react';

export default function ClientRelatedLeadsPanel({ client }) {
    if (!client) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target size={20} className="text-red-500" />
                Oportunidades (Leads)
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-neutral-500" />
                </div>
                <h4 className="text-white font-bold mb-2">Módulo en Desarrollo</h4>
                <p className="text-sm text-neutral-400 max-w-xs">
                    Las oportunidades comerciales (Leads) relacionadas con este cliente se visualizarán aquí próximamente (Fase 3.2).
                </p>
            </div>
        </div>
    );
}
