import React from 'react';
import { Clock, CheckCircle2, XCircle, RefreshCcw, ShieldAlert, AlertCircle } from 'lucide-react';

export default function ReservationStatusBadge({ status, isOverdue }) {
    if (!status) return null;

    let styles = "";
    let Icon = null;
    let label = status.toUpperCase();

    // Si está activa pero la fecha actual superó expiresAt, se muestra como vencida visualmente
    if (status === 'activa' && isOverdue) {
        styles = "bg-orange-500/10 text-orange-400 border-orange-500/20";
        Icon = AlertCircle;
        label = "POR VENCER / VENCIDA";
    } else {
        switch (status) {
            case 'activa':
                styles = "bg-green-500/10 text-green-400 border-green-500/20";
                Icon = CheckCircle2;
                break;
            case 'convertida':
                styles = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                Icon = CheckCircle2;
                break;
            case 'vencida':
                styles = "bg-red-500/10 text-red-400 border-red-500/20";
                Icon = XCircle;
                break;
            case 'cancelada':
                styles = "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
                Icon = XCircle;
                break;
            case 'devuelta':
                styles = "bg-neutral-500/10 text-neutral-300 border-neutral-600";
                Icon = RefreshCcw;
                break;
            case 'retenida':
                styles = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                Icon = ShieldAlert;
                break;
            default:
                styles = "bg-neutral-800 text-neutral-400 border-neutral-700";
                Icon = Clock;
        }
    }

    return (
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${styles}`}>
            {Icon && <Icon size={12} />}
            {label}
        </span>
    );
}
