import React from 'react';

export default function LeadPriorityBadge({ priority }) {
    const value = priority || 'media';
    const styles = {
        alta: 'border-crm-red/20 bg-crm-red/10 text-red-300',
        media: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
        baja: 'border-crm-border bg-crm-bg text-crm-fg-muted'
    };

    return (
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold capitalize ${styles[value] || styles.media}`}>
            {value}
        </span>
    );
}
