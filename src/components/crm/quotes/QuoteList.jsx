import React from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Calendar, User } from 'lucide-react';

const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const getStatusConfig = (status) => {
    switch (status) {
        case 'aprobada':
            return { label: 'Aprobada', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
        case 'enviada':
            return { label: 'Enviada', className: 'border-blue-500/30 bg-blue-500/10 text-blue-300' };
        case 'en_revision':
            return { label: 'En Revisión', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
        case 'modificada':
            return { label: 'Modificada', className: 'border-purple-500/30 bg-purple-500/10 text-purple-300' };
        case 'rechazada':
            return { label: 'Rechazada', className: 'border-red-500/30 bg-red-500/10 text-red-300' };
        default:
            return { label: 'Pendiente', className: 'border-crm-fg-subtle/30 bg-crm-surface text-crm-fg-muted' };
    }
};

export default function QuoteList({ quotes }) {
    if (!quotes || quotes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-crm-border bg-crm-surface">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-crm-bg mb-4">
                    <FileText className="text-crm-fg-muted" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No hay cotizaciones</h3>
                <p className="text-sm text-crm-fg-muted max-w-sm">
                    Todavía no hay cotizaciones cargadas. Podés crear una desde el botón de arriba.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-crm-border bg-crm-surface">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-crm-surface-raised text-xs uppercase tracking-wider text-crm-fg-muted">
                    <tr>
                        <th className="px-4 py-3 font-semibold">Cotización</th>
                        <th className="px-4 py-3 font-semibold">Cliente</th>
                        <th className="px-4 py-3 font-semibold">Vehículo</th>
                        <th className="px-4 py-3 font-semibold">Monto</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-crm-border">
                    {quotes.map(quote => {
                        const status = getStatusConfig(quote.status);
                        
                        return (
                            <tr key={quote._id} className="transition-colors hover:bg-crm-surface-raised/50">
                                <td className="px-4 py-3">
                                    <div className="font-bold text-white flex items-center gap-2">
                                        <FileText size={14} className="text-crm-red" />
                                        #{quote.quoteNumber || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 text-xs text-crm-fg-muted">
                                        <Calendar size={12} />
                                        {new Date(quote.issueDate).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-white">{quote.clientId?.fullName || 'Cliente Eliminado'}</div>
                                    <div className="text-xs text-crm-fg-muted mt-0.5">{quote.clientId?.phone || '--'}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-white truncate max-w-[200px]">
                                        {quote.vehicleId ? `${quote.vehicleId.brand} ${quote.vehicleId.model}` : quote.vehicleDescription || 'Sin especificar'}
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-white">
                                    {formatCurrency(quote.price, quote.currency)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                                        {status.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/admin/cotizaciones/${quote._id}`}
                                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-crm-surface-raised"
                                    >
                                        Ver <ArrowRight size={14} />
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
