import React from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function ClientsTable({ clients }) {
    const router = useRouter();

    if (!clients || clients.length === 0) {
        return (
            <div className="bg-crm-surface border border-crm-border rounded-xl p-12 text-center">
                <p className="text-crm-fg-muted">No se encontraron clientes.</p>
            </div>
        );
    }

    const getTypeColor = (type) => {
        switch(type) {
            case 'comprador': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'vendedor': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'ambos': return 'bg-green-500/10 text-green-400 border-green-500/20';
            default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        }
    };

    return (
        <div className="bg-crm-surface border border-crm-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-crm-fg-muted">
                    <thead className="bg-crm-topbar text-[10px] uppercase text-crm-fg-muted font-bold border-b border-crm-border">
                        <tr>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Contacto</th>
                            <th className="px-6 py-4">Tipo / Origen</th>
                            <th className="px-6 py-4">Ubicación</th>
                            <th className="px-6 py-4">Alta</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {clients.map(client => (
                            <tr key={client._id} className="hover:bg-crm-surface-raised transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-base">{client.fullName}</span>
                                        {client.dniCuit && <span className="text-xs text-crm-fg-muted">Doc: {client.dniCuit}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-crm-fg-muted text-xs">
                                                <Phone size={12} />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                        {client.email && (
                                            <div className="flex items-center gap-2 text-crm-fg-muted text-xs">
                                                <Mail size={12} />
                                                <span className="truncate max-w-[150px]">{client.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2 items-start">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${getTypeColor(client.type)}`}>
                                            {client.type}
                                        </span>
                                        <span className="text-xs text-crm-fg-muted uppercase tracking-wider">
                                            {client.source}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {(client.locality || client.province) ? (
                                        <div className="flex items-center gap-2 text-crm-fg-muted text-xs">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="truncate max-w-[120px]">
                                                {[client.locality, client.province].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-crm-fg-muted text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-crm-fg-muted">
                                    {new Date(client.createdAt).toLocaleDateString('es-AR')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <CrmButton 
                                        variant="secondary"
                                        onClick={() => router.push(`/admin/clientes/${client._id}`)}
                                        className="gap-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity float-right"
                                    >
                                        Ver Ficha
                                        <ArrowRight size={14} />
                                    </CrmButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
