import React from 'react';
import { CheckCircle2, Clock, XCircle, FileEdit, Truck } from 'lucide-react';

export default function SaleStatusBadge({ status }) {
    const getBadgeStyle = () => {
        switch (status) {
            case 'borrador':
                return {
                    bg: 'bg-crm-surface-raised',
                    border: 'border-crm-border',
                    text: 'text-crm-fg-muted',
                    icon: <FileEdit size={14} className="text-crm-fg-muted" />,
                    label: 'Borrador'
                };
            case 'confirmada':
                return {
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    text: 'text-blue-400',
                    icon: <CheckCircle2 size={14} className="text-blue-500" />,
                    label: 'Confirmada'
                };
            case 'pendiente_entrega':
                return {
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/20',
                    text: 'text-orange-400',
                    icon: <Clock size={14} className="text-orange-500" />,
                    label: 'Pdte. Entrega'
                };
            case 'entregada':
                return {
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/20',
                    text: 'text-green-400',
                    icon: <Truck size={14} className="text-green-500" />,
                    label: 'Entregada'
                };
            case 'cancelada':
                return {
                    bg: 'bg-crm-red/10',
                    border: 'border-red-500/20',
                    text: 'text-red-400',
                    icon: <XCircle size={14} className="text-crm-red" />,
                    label: 'Cancelada'
                };
            default:
                return {
                    bg: 'bg-crm-surface-raised',
                    border: 'border-crm-border',
                    text: 'text-crm-fg-muted',
                    icon: null,
                    label: status || 'Desconocido'
                };
        }
    };

    const style = getBadgeStyle();

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${style.bg} ${style.border}`}>
            {style.icon}
            <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                {style.label}
            </span>
        </div>
    );
}
