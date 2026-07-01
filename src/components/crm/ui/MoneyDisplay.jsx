import React from 'react';

export default function MoneyDisplay({
    amount,
    currency = 'ARS',
    showBadge = false,
    className = ''
}) {
    const formattedAmount = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);

    if (showBadge) {
        const isUsd = currency === 'USD';
        return (
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                isUsd ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-crm-surface-raised text-crm-fg-muted border border-crm-border'
            } ${className}`}>
                {formattedAmount}
            </span>
        );
    }

    return (
        <span className={`font-semibold text-crm-fg ${className}`}>
            {formattedAmount}
        </span>
    );
}
