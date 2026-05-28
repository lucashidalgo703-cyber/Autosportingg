import React from 'react';

export default function InstallmentStatusBadge({ status, dueDate }) {
    const isOverdue = status === 'pendiente' && new Date(dueDate) < new Date();
    const effectiveStatus = isOverdue ? 'vencida' : status;

    switch (effectiveStatus) {
        case 'pendiente':
            return (
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/20">
                    Pendiente
                </span>
            );
        case 'vencida':
            return (
                <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20">
                    Vencida
                </span>
            );
        case 'pagada_manual':
            return (
                <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
                    Pagada (M)
                </span>
            );
        case 'anulada':
            return (
                <span className="text-xs font-bold text-neutral-400 bg-neutral-400/10 px-2.5 py-1 rounded-full border border-neutral-400/20">
                    Anulada
                </span>
            );
        default:
            return (
                <span className="text-xs font-bold text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700">
                    {status}
                </span>
            );
    }
}
