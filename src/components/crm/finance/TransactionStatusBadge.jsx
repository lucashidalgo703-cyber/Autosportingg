import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function TransactionStatusBadge({ status }) {
    const config = {
        activo: {
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            text: 'text-green-500',
            icon: <CheckCircle2 size={14} className="text-green-500" />,
            label: 'Activo'
        },
        anulado: {
            bg: 'bg-crm-red/10',
            border: 'border-red-500/20',
            text: 'text-crm-red',
            icon: <XCircle size={14} className="text-crm-red" />,
            label: 'Anulado'
        }
    };

    const currentConfig = config[status?.toLowerCase()] || config.activo;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentConfig.bg} ${currentConfig.border} ${currentConfig.text}`}>
            {currentConfig.icon}
            {currentConfig.label}
        </span>
    );
}
