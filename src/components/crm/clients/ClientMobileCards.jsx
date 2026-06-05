import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Filter, Mail, MapPin, Phone } from 'lucide-react';

const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toISOString().slice(0, 10);
};

const getTypeLabel = (type) => {
    if (type === 'comprador') return 'Comprador';
    if (type === 'vendedor') return 'Vendedor';
    if (type === 'ambos') return 'Ambos';
    return 'Potencial';
};

const getTypeColor = (type) => {
    switch (type) {
        case 'comprador': return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
        case 'vendedor': return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
        case 'ambos': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
        default: return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    }
};

const getStatusLabel = (status) => {
    if (status === 'activo') return '✓ Activo';
    if (status === 'bloqueado') return '! Bloqueado';
    if (status === 'inactivo') return '○ Inactivo';
    return status || '--';
};

export default function ClientMobileCards({ clients }) {
    const [expandedId, setExpandedId] = useState(clients?.[0]?._id || null);

    if (!clients || clients.length === 0) {
        return (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface px-5 py-12 text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-crm-fg-muted">
                    <Filter size={20} />
                </div>
                <h2 className="m-0 text-lg font-bold text-crm-fg">Sin resultados</h2>
                <p className="m-0 mt-2 text-sm leading-6 text-crm-fg-muted">
                    No hay clientes para los filtros seleccionados.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} en lista
                <span className="mx-1 text-crm-fg-muted">·</span>
                <span className="text-crm-fg-muted">Base comercial</span>
            </div>

            <div className="flex flex-col gap-3">
                {clients.map(client => {
                    const isExpanded = expandedId === client._id;

                    return (
                        <article key={client._id} className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : client._id)}
                                className="m-0 flex w-full appearance-none items-center justify-between gap-3 border-0 bg-transparent px-3 py-3 text-left text-crm-fg"
                            >
                                <div className="min-w-0">
                                    <h3 className="m-0 truncate text-sm font-semibold leading-5 text-crm-fg">{client.fullName}</h3>
                                    <p className="m-0 mt-1 truncate text-xs text-crm-fg-muted">
                                        {getStatusLabel(client.status)} · {client.source || 'sin origen'}
                                    </p>
                                </div>
                                <ChevronDown
                                    size={18}
                                    className={`shrink-0 text-crm-fg-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {isExpanded && (
                                <div className="border-t border-crm-border bg-crm-bg/40 px-3 py-3">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${getTypeColor(client.type)}`}>
                                            {getTypeLabel(client.type)}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                                            Alta {formatDate(client.createdAt)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        <InfoItem icon={Phone} label="Tel" value={client.phone || '--'} />
                                        <InfoItem icon={Mail} label="Email" value={client.email || '--'} />
                                        <InfoItem icon={MapPin} label="Ubic." value={[client.locality, client.province].filter(Boolean).join(', ') || '--'} />
                                        <InfoItem label="Doc." value={client.dniCuit || '--'} />
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 border-t border-crm-border pt-3">
                                        <Link
                                            href={`/admin/clientes/${client._id}`}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-crm-red/10 px-3 text-xs font-semibold text-red-300 no-underline transition-colors hover:bg-crm-red/15"
                                        >
                                            Ver ficha
                                        </Link>
                                        <Link
                                            href={`/admin/clientes/${client._id}`}
                                            className="inline-flex h-7 items-center justify-center rounded-lg bg-crm-surface-raised px-3 text-xs font-semibold text-crm-fg no-underline transition-colors hover:bg-crm-border"
                                        >
                                            Editar
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex min-w-0 items-center gap-2 text-crm-fg-muted">
            {Icon && <Icon size={12} className="shrink-0" />}
            <span className="font-semibold text-crm-fg-muted">{label}: </span>
            <span className="truncate text-crm-fg">{value}</span>
        </div>
    );
}
