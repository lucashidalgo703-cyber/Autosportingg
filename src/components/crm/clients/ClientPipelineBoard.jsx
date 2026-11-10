import React from 'react';
import Link from 'next/link';
import { CLIENT_PIPELINE_STAGES, getClientPipelineStage, formatClientNextAction } from '../../../utils/clientCommercial';

export default function ClientPipelineBoard({ clients, onChangeStatus, readOnly = false, pipelineCounts = {}, busyId }) {
    const columns = CLIENT_PIPELINE_STAGES.map(stage => ({ ...stage, title: stage.label }));
    if (clients.some(client => !columns.some(stage => stage.id === getClientPipelineStage(client)))) columns.push({ id: 'otras', title: 'Otras etapas', color: 'border-crm-border text-crm-fg-muted' });
    const getClientsByStatus = (status) => {
        return clients.filter(c => status === 'otras' ? !CLIENT_PIPELINE_STAGES.some(stage => stage.id === getClientPipelineStage(c)) : getClientPipelineStage(c) === status);
    };

    const handleDragStart = (e, clientId) => {
        if (!readOnly && !busyId) e.dataTransfer.setData('clientId', clientId);
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        const clientId = e.dataTransfer.getData('clientId');
        if (!readOnly && !busyId && status !== 'otras' && clientId && onChangeStatus) {
            onChangeStatus(clientId, status);
        }
    };

    const handleDragOver = (e) => {
        if (!readOnly && !busyId) e.preventDefault();
    };

    return (
        <div aria-label="Pipeline de clientes" className="w-full min-w-0 overflow-x-auto custom-scrollbar pb-4 flex gap-3">
            {columns.map(col => {
                const columnClients = getClientsByStatus(col.id);
                return (
                    <div 
                        key={col.id} 
                        className="w-64 flex-shrink-0 flex flex-col gap-3 bg-crm-surface/50 rounded-xl p-3 border border-crm-border"
                        onDrop={(e) => handleDrop(e, col.id)}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border ${col.color}`}>
                                {col.title}
                            </span>
                            <span className="text-xs text-crm-fg-muted bg-crm-bg px-2 py-0.5 rounded-full border border-crm-border">
                                {pipelineCounts[col.id] != null && pipelineCounts[col.id] !== columnClients.length ? `${columnClients.length} / ${pipelineCounts[col.id]}` : columnClients.length}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-h-[100px]">
                            {columnClients.map(client => (
                                <div 
                                    key={client._id}
                                    draggable={!readOnly && !busyId}
                                    onDragStart={(e) => handleDragStart(e, client._id)}
                                    className="bg-crm-bg border border-crm-border p-3 rounded-lg cursor-grab active:cursor-grabbing hover:border-crm-red/50 transition-colors"
                                >
                                    <Link href={`/admin/clientes/${client._id}`} className="text-sm font-semibold text-crm-fg no-underline hover:text-crm-red">{client.fullName}</Link>
                                    <p className="text-xs text-crm-fg-muted mb-2 line-clamp-1">{client.vehicleOfInterest || 'Sin vehículo'}</p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-crm-border/50">
                                        <span className="text-[10px] text-crm-fg-muted">{client.phone || client.email}</span>
                                        <span className="text-[10px] text-crm-fg-muted bg-crm-surface px-1.5 py-0.5 rounded">
                                            {client.reason === 'entro_puerta' ? 'Local' : 'Digital'}
                                        </span>
                                    </div>
                                    <p className="my-2 text-xs text-crm-fg-muted">{client.assignedTo?.name || 'Sin vendedor'} · {formatClientNextAction(client)}</p>
                                    {client.nextAction && <p className="my-2 text-xs text-crm-fg-muted">{client.nextAction}</p>}
                                    {!readOnly && <select aria-label={`Etapa de ${client.fullName}`} value={getClientPipelineStage(client)} disabled={Boolean(busyId)} onChange={event => onChangeStatus(client._id, event.target.value)} className="w-full rounded border border-crm-border bg-crm-surface px-2 py-1.5 text-xs text-crm-fg">
                                        {col.id === 'otras' && <option value={getClientPipelineStage(client)}>Etapa a revisar</option>}
                                        {CLIENT_PIPELINE_STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                                    </select>}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
