import React from 'react';

export default function LeadStatusBadge({ status, legacyStage }) {
    // Si tiene un status real de CRM_V2 lo usamos como primario
    if (status && status !== 'nuevo') {
        const styles = {
            nuevo: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            contactado: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            interesado: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            seguimiento: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            reservado: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            convertido: 'bg-green-500/10 text-green-400 border-green-500/20',
            perdido: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
        };

        const className = styles[status] || styles['nuevo'];

        return (
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block ${className}`}>
                {status}
            </span>
        );
    }

    // Si no tiene status V2 pero tiene pipelineStage legacy, mostramos un badge diferente
    if (legacyStage) {
        return (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block bg-neutral-800 text-neutral-300 border-neutral-600">
                Legacy: {legacyStage}
            </span>
        );
    }

    // Fallback absoluto
    return (
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block bg-blue-500/10 text-blue-400 border-blue-500/20">
            NUEVO
        </span>
    );
}
