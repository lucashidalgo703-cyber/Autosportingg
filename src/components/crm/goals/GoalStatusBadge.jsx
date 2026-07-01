"use client";
import React from 'react';

export default function GoalStatusBadge({ status }) {
    if (!status) return null;
    
    const s = status.toLowerCase();
    
    let colorClass = 'bg-indigo-500/20 text-indigo-400';
    
    if (s === 'superado') colorClass = 'bg-green-600/30 text-green-300';
    else if (s === 'cumplido') colorClass = 'bg-green-500/20 text-green-400';
    else if (s === 'proximo_vencer') colorClass = 'bg-orange-500/20 text-orange-400';
    else if (s === 'atrasado') colorClass = 'bg-yellow-500/20 text-yellow-500';
    else if (s === 'vencido') colorClass = 'bg-crm-red/20 text-red-400';
    else if (s === 'sin_avance') colorClass = 'bg-gray-500/20 text-crm-fg-muted';

    return (
        <span className={`text-xs px-2 py-1 rounded font-bold uppercase whitespace-nowrap ${colorClass}`}>
            {s.replace('_', ' ')}
        </span>
    );
}
