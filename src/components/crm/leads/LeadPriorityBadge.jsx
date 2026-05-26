import React from 'react';

export default function LeadPriorityBadge({ priority }) {
    const p = priority || 'media';
    
    const styles = {
        alta: 'bg-red-500/10 text-red-500 border-red-500/20',
        media: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        baja: 'bg-neutral-800 text-neutral-400 border-neutral-700'
    };

    const className = styles[p];

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${className}`}>
            {p}
        </span>
    );
}
