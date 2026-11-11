import React from 'react';
import Link from 'next/link';
import { ArrowRight, Filter, Mail, MapPin, Phone } from 'lucide-react';

const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toISOString().slice(0, 10);
};

const getTypeLabel = (type) => {
    const normalized = type || 'potencial';
    if (normalized === 'comprador') return 'Comprador';
    if (normalized === 'vendedor') return 'Vendedor';
    if (normalized === 'ambos') return 'Ambos';
    return 'Potencial';
};

const getStatusLabel = (status) => {
    if (status === 'activo') return '✓ Activo';
    if (status === 'bloqueado') return '! Bloqueado';
    if (status === 'inactivo') return '○ Inactivo';
    return status || '--';
};

const getTypeColor = (type) => {
    switch (type) {
        case 'comprador': return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
        case 'vendedor': return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
        case 'ambos': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
        default: return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    }
};

const getStatusColor = (status) => {
    if (status === 'activo') return 'text-emerald-300';
    if (status === 'bloqueado') return 'text-red-300';
    return 'text-crm-fg-muted';
};

export default function ClientsTable({ clients, selectedIds = [], setSelectedIds }) {
    if (!clients || clients.length === 0) {
        return (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface px-6 py-16 text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-crm-fg-muted">
                    <Filter size={20} />
                </div>
                <h2 className="m-0 text-lg font-bold text-crm-fg">Sin resultados</h2>
                <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                    No hay clientes para los filtros seleccionados.
                </p>
            </div>
        );
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allVisibleIds = clients.map(c => c._id);
            // Combine without duplicates
            setSelectedIds(Array.from(new Set([...selectedIds, ...allVisibleIds])));
        } else {
            const visibleIds = new Set(clients.map(c => c._id));
            setSelectedIds(selectedIds.filter(id => !visibleIds.has(id)));
        }
    };

    const handleSelectRow = (e, id) => {
        if (e.target.checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        }
    };

    const isAllVisibleSelected = clients.length > 0 && clients.every(c => selectedIds.includes(c._id));

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} en lista
                <span className="mx-1 text-crm-fg-muted">·</span>
                <span className="text-crm-fg-muted">Base comercial</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-crm-border bg-crm-surface">
                <table className="w-full min-w-[980px] border-collapse text-left">
                    <thead className="bg-crm-surface-raised text-xs uppercase text-crm-fg-muted">
                        <tr>
                            <th className="px-3 py-2 text-center w-[40px]">
                                <input 
                                    type="checkbox" 
                                    className="cursor-pointer accent-crm-red"
                                    checked={isAllVisibleSelected}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-3 py-2 font-semibold">Cliente</th>
                            <th className="px-3 py-2 font-semibold">Contacto</th>
                            <th className="px-3 py-2 font-semibold">Tipo</th>
                            <th className="px-3 py-2 font-semibold">Estado</th>
                            <th className="px-3 py-2 font-semibold">Origen</th>
                            <th className="px-3 py-2 font-semibold">Ubicacion</th>
                            <th className="px-3 py-2 font-semibold">Alta</th>
                            <th className="px-3 py-2 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {clients.map(client => {
                            const isSelected = selectedIds.includes(client._id);
                            return (
                                <tr key={client._id} className={`h-[76px] text-sm text-crm-fg transition-colors hover:bg-crm-surface-raised/70 ${isSelected ? 'bg-crm-red/5' : ''}`}>
                                    <td className="px-3 py-2 align-middle text-center">
                                        <input 
                                            type="checkbox" 
                                            className="cursor-pointer accent-crm-red"
                                            checked={isSelected}
                                            onChange={(e) => handleSelectRow(e, client._id)}
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <div className="font-semibold leading-5 text-crm-fg">{client.fullName}</div>
                                    <div className="mt-0.5 text-xs text-crm-fg-muted">{client.dniCuit ? `Doc: ${client.dniCuit}` : 'Sin documento'}</div>
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <div className="flex flex-col gap-1 text-xs text-crm-fg-muted">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Phone size={12} className="shrink-0" />
                                            <span className="truncate">{client.phone || '--'}</span>
                                        </span>
                                        <span className="flex min-w-0 items-center gap-2">
                                            <Mail size={12} className="shrink-0" />
                                            <span className="max-w-[180px] truncate">{client.email || '--'}</span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${getTypeColor(client.type)}`}>
                                        {getTypeLabel(client.type)}
                                    </span>
                                </td>
                                <td className={`px-3 py-2 align-middle text-xs font-semibold ${getStatusColor(client.status)}`}>
                                    {getStatusLabel(client.status)}
                                </td>
                                <td className="px-3 py-2 align-middle text-xs uppercase tracking-[0.08em] text-crm-fg-muted">
                                    {client.source || '--'}
                                </td>
                                <td className="px-3 py-2 align-middle">
                                    <div className="flex max-w-[150px] items-center gap-2 text-xs text-crm-fg-muted">
                                        <MapPin size={12} className="shrink-0" />
                                        <span className="truncate">{[client.locality, client.province].filter(Boolean).join(', ') || '--'}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 align-middle text-xs text-crm-fg-muted">{formatDate(client.createdAt)}</td>
                                <td className="px-3 py-2 align-middle">
                                    <Link
                                        href={`/admin/clientes/${client._id}`}
                                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised"
                                    >
                                        Ver ficha
                                        <ArrowRight size={13} />
                                    </Link>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
