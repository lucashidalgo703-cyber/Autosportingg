import React from 'react';

export default function LeadStatusBadge({ status, legacyStage }) {
    if (status && status !== 'nuevo') {
        const styles = {
            nuevo: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
            contactado: 'border-purple-500/20 bg-purple-500/10 text-purple-300',
            interesado: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
            seguimiento: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
            reservado: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
            convertido: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
            perdido: 'border-crm-border bg-crm-bg text-crm-fg-muted',
        };

        return (
            <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${styles[status] || styles.nuevo}`}>
                {status}
            </span>
        );
    }

    if (legacyStage) {
        return (
            <span className="inline-block rounded border border-crm-border bg-crm-bg px-2 py-0.5 text-[10px] font-bold uppercase text-crm-fg-muted">
                Legacy: {legacyStage}
            </span>
        );
    }

    return (
        <span className="inline-block rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-300">
            Nuevo
        </span>
    );
}
