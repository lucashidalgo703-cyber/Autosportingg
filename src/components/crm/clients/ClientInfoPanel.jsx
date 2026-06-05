import React from 'react';
import { Briefcase, FileText, Mail, MapPin, Phone, Tag, UserCircle } from 'lucide-react';

export default function ClientInfoPanel({ client }) {
    if (!client) return null;

    const InfoItem = ({ icon: Icon, label, value }) => (
        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
            <div className="mb-1 flex items-center gap-2 text-crm-fg-muted">
                <Icon size={14} />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]">{label}</span>
            </div>
            <div className="text-sm font-semibold text-crm-fg">
                {value || <span className="font-normal italic text-crm-fg-subtle">No especificado</span>}
            </div>
        </div>
    );

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex items-center gap-2 text-lg font-bold text-crm-fg">
                <FileText size={19} className="text-crm-red" />
                Datos del cliente
            </h3>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoItem icon={Phone} label="Telefono" value={client.phone} />
                <InfoItem icon={Mail} label="Email" value={client.email} />
                <InfoItem icon={UserCircle} label="DNI / CUIT" value={client.dniCuit} />
                <InfoItem
                    icon={MapPin}
                    label="Ubicacion"
                    value={[client.locality, client.province].filter(Boolean).join(', ')}
                />
                <InfoItem icon={Briefcase} label="Tipo" value={<span className="capitalize">{client.type}</span>} />
                <InfoItem icon={Tag} label="Origen" value={<span className="capitalize">{client.source}</span>} />
            </div>

            {client.address && (
                <div className="mb-5">
                    <InfoItem icon={MapPin} label="Direccion" value={client.address} />
                </div>
            )}

            <div className="flex-1 rounded-xl border border-crm-border bg-crm-bg p-4">
                <div className="mb-2 flex items-center gap-2 text-crm-fg-muted">
                    <FileText size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Notas internas</span>
                </div>
                <div className="whitespace-pre-wrap text-sm text-crm-fg">
                    {client.notes || <span className="italic text-crm-fg-subtle">Sin notas registradas.</span>}
                </div>
            </div>
        </div>
    );
}
