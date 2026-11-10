import React from 'react';
import { Briefcase, FileText, Mail, MapPin, Phone, Tag, UserCircle } from 'lucide-react';
import { CLIENT_PIPELINE_STAGES, getClientPipelineStage, formatClientNextAction } from '../../../utils/clientCommercial';

export default function ClientInfoPanel({ client }) {
    if (!client) return null;

    const InfoItem = ({ icon: Icon, label, value, compact = false }) => (
        <div className={`rounded-xl border border-crm-border bg-crm-bg ${compact ? 'p-2.5' : 'p-4'}`}>
            <div className="mb-1 flex items-center gap-2 text-crm-fg-muted">
                <Icon size={14} />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]">{label}</span>
            </div>
            <div className="break-words whitespace-pre-wrap text-sm font-semibold text-crm-fg">
                {value || <span className="font-normal italic text-crm-fg-subtle">No especificado</span>}
            </div>
        </div>
    );

    const stage = CLIENT_PIPELINE_STAGES.find(item => item.id === getClientPipelineStage(client))?.label || 'Etapa a revisar';
    const hasBudget = client.maxBudget !== null && client.maxBudget !== undefined && client.maxBudget !== '';
    const budget = !hasBudget ? null : !Number.isFinite(client.maxBudget) || client.maxBudget < 0 ? 'Importe a revisar'
        : !['ARS', 'USD'].includes(client.currency) ? 'Moneda a revisar'
            : `${client.currency} ${client.maxBudget.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
    const hasYearFrom = client.yearFrom !== null && client.yearFrom !== undefined && client.yearFrom !== '';
    const hasYearTo = client.yearTo !== null && client.yearTo !== undefined && client.yearTo !== '';
    const validYear = year => Number.isInteger(year) && year >= 1000 && year <= 9999;
    const years = (hasYearFrom && !validYear(client.yearFrom)) || (hasYearTo && !validYear(client.yearTo)) || (hasYearFrom && hasYearTo && client.yearFrom > client.yearTo)
        ? 'Rango a revisar' : [hasYearFrom ? `Desde ${client.yearFrom}` : '', hasYearTo ? `Hasta ${client.yearTo}` : ''].filter(Boolean).join(' · ');

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

            <details className="mb-5 rounded-xl border border-crm-border bg-crm-bg/30 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-crm-fg">Seguimiento comercial</summary>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <InfoItem compact icon={Tag} label="Etapa" value={stage} />
                    <InfoItem compact icon={UserCircle} label="Responsable" value={client.assignedTo?.name || client.assignedTo?.email || (client.assignedTo ? 'Responsable asignado' : 'Sin vendedor')} />
                    <InfoItem compact icon={FileText} label="Próxima acción" value={client.nextAction} />
                    <InfoItem compact icon={FileText} label="Fecha del próximo paso" value={formatClientNextAction(client)} />
                    <InfoItem compact icon={Briefcase} label="Vehículo de interés" value={client.vehicleOfInterest} />
                    <InfoItem compact icon={Briefcase} label="Qué busca" value={client.description} />
                    <InfoItem compact icon={Tag} label="Marca / modelo" value={[client.brand, client.model].filter(Boolean).join(' · ')} />
                    <InfoItem compact icon={Briefcase} label="Presupuesto máximo" value={budget} />
                    {(hasYearFrom || hasYearTo) && <InfoItem compact icon={Tag} label="Años buscados" value={years} />}
                </div>
            </details>

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
