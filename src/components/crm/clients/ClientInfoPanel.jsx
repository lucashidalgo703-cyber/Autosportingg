import React from 'react';
import { Mail, Phone, MapPin, Briefcase, Tag, FileText, UserCircle } from 'lucide-react';

export default function ClientInfoPanel({ client }) {
    if (!client) return null;

    const InfoItem = ({ icon: Icon, label, value }) => (
        <div className="flex flex-col gap-1 p-4 bg-neutral-800/30 rounded-xl border border-neutral-800/50">
            <div className="flex items-center gap-2 text-neutral-500 mb-1">
                <Icon size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-white font-medium text-sm">
                {value || <span className="text-neutral-600 italic">No especificado</span>}
            </div>
        </div>
    );

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <FileText size={20} className="text-red-500" />
                Datos del Cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <InfoItem icon={Phone} label="Teléfono" value={client.phone} />
                <InfoItem icon={Mail} label="Email" value={client.email} />
                <InfoItem icon={UserCircle} label="DNI / CUIT" value={client.dniCuit} />
                <InfoItem 
                    icon={MapPin} 
                    label="Ubicación" 
                    value={[client.locality, client.province].filter(Boolean).join(', ')} 
                />
                <InfoItem icon={Briefcase} label="Tipo" value={<span className="capitalize">{client.type}</span>} />
                <InfoItem icon={Tag} label="Origen" value={<span className="capitalize">{client.source}</span>} />
            </div>

            {client.address && (
                <div className="mb-6">
                    <InfoItem icon={MapPin} label="Dirección Exacta" value={client.address} />
                </div>
            )}

            <div className="flex-1">
                <div className="flex flex-col gap-1 p-4 bg-neutral-800/30 rounded-xl border border-neutral-800/50 h-full">
                    <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <FileText size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Notas Internas</span>
                    </div>
                    <div className="text-white text-sm whitespace-pre-wrap flex-1">
                        {client.notes ? (
                            client.notes
                        ) : (
                            <span className="text-neutral-600 italic">Sin notas registradas.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
