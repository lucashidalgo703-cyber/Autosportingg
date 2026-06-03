import React from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, MapPin, ChevronRight } from 'lucide-react';

export default function ClientMobileCards({ clients }) {
    const router = useRouter();

    if (!clients || clients.length === 0) {
        return (
            <div className="bg-crm-surface border border-crm-border rounded-xl p-12 text-center">
                <p className="text-crm-fg-muted text-sm">No se encontraron clientes.</p>
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
        <div className="flex flex-col gap-4">
            {clients.map(client => (
                <div 
                    key={client._id} 
                    className="bg-crm-surface border border-crm-border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden"
                >
                    {/* Indicador lateral */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600/50"></div>
                    
                    <div className="flex justify-between items-start pl-2">
                        <div>
                            <h3 className="font-bold text-white text-lg leading-tight">{client.fullName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getTypeColor(client.type)}`}>
                                    {client.type}
                                </span>
                                <span className="text-[10px] text-crm-fg-muted uppercase tracking-wider">
                                    {client.source}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 pl-2">
                        {client.phone && (
                            <div className="flex items-center gap-2 text-crm-fg-muted text-xs">
                                <Phone size={12} className="text-crm-fg-muted" />
                                <span>{client.phone}</span>
                            </div>
                        )}
                        {client.email && (
                            <div className="flex items-center gap-2 text-crm-fg-muted text-xs">
                                <Mail size={12} className="text-crm-fg-muted" />
                                <span className="truncate">{client.email}</span>
                            </div>
                        )}
                        {(client.locality || client.province) && (
                            <div className="flex items-center gap-2 text-crm-fg-muted text-xs mt-1">
                                <MapPin size={12} className="shrink-0" />
                                <span className="truncate">
                                    {[client.locality, client.province].filter(Boolean).join(', ')}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="pl-2 mt-2 pt-3 border-t border-crm-border flex justify-between items-center">
                        <span className="text-[10px] text-crm-fg-muted">
                            Alta: {new Date(client.createdAt).toLocaleDateString('es-AR')}
                        </span>
                        <button 
                            onClick={() => router.push(`/admin/clientes/${client._id}`)}
                            className="text-crm-red hover:text-crm-red text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                            Ver Ficha <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
