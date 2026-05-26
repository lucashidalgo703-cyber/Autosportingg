import React from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, MapPin, AlertCircle } from 'lucide-react';

export default function ClientsTable({ clients }) {
    const router = useRouter();

    if (!clients || clients.length === 0) {
        return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
                <p className="text-neutral-400">No se encontraron clientes.</p>
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-300">
                    <thead className="bg-neutral-800/50 text-xs uppercase text-neutral-400 font-bold border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Contacto</th>
                            <th className="px-6 py-4">Tipo / Origen</th>
                            <th className="px-6 py-4">Ubicación</th>
                            <th className="px-6 py-4">Alta</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {clients.map(client => (
                            <tr key={client._id} className="hover:bg-neutral-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-base">{client.fullName}</span>
                                        {client.dniCuit && <span className="text-xs text-neutral-500">Doc: {client.dniCuit}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-neutral-400 text-xs">
                                                <Phone size={12} />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                        {client.email && (
                                            <div className="flex items-center gap-2 text-neutral-400 text-xs">
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
                                        <span className="text-xs text-neutral-500 uppercase tracking-wider">
                                            {client.source}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {(client.locality || client.province) ? (
                                        <div className="flex items-center gap-2 text-neutral-400 text-xs">
                                            <MapPin size={12} className="shrink-0" />
                                            <span className="truncate max-w-[120px]">
                                                {[client.locality, client.province].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-neutral-600 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-neutral-400">
                                    {new Date(client.createdAt).toLocaleDateString('es-AR')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => router.push(`/admin/clientes/${client._id}`)}
                                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Ver Ficha
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
