import React from 'react';

const columns = [
    { id: 'nuevo', title: 'Nuevo', color: 'border-blue-500/50 bg-blue-500/10 text-blue-300' },
    { id: 'contactado', title: 'Contactado', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
    { id: 'cita_agendada', title: 'Cita agendada', color: 'border-purple-500/50 bg-purple-500/10 text-purple-300' },
    { id: 'mostrando_autos', title: 'Mostrando autos', color: 'border-orange-500/50 bg-orange-500/10 text-orange-300' },
    { id: 'en_negociacion', title: 'En negociación', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' },
    { id: 'propuesta_enviada', title: 'Propuesta enviada', color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' },
    { id: 'cerrado', title: 'Cerrado', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
    { id: 'sin_interes', title: 'Sin interés', color: 'border-red-500/50 bg-red-500/10 text-red-300' }
];

export default function ClientPipelineBoard({ clients, onChangeStatus }) {
    const getClientsByStatus = (status) => {
        return clients.filter(c => (c.pipelineStage || 'nuevo') === status);
    };

    const handleDragStart = (e, clientId) => {
        e.dataTransfer.setData('clientId', clientId);
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        const clientId = e.dataTransfer.getData('clientId');
        if (clientId && onChangeStatus) {
            onChangeStatus(clientId, status);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar pb-4 flex gap-4 min-w-max">
            {columns.map(col => {
                const columnClients = getClientsByStatus(col.id);
                return (
                    <div 
                        key={col.id} 
                        className="w-72 flex-shrink-0 flex flex-col gap-3 bg-crm-surface/50 rounded-xl p-3 border border-crm-border"
                        onDrop={(e) => handleDrop(e, col.id)}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border ${col.color}`}>
                                {col.title}
                            </span>
                            <span className="text-xs text-crm-fg-muted bg-crm-bg px-2 py-0.5 rounded-full border border-crm-border">
                                {columnClients.length}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-h-[100px]">
                            {columnClients.map(client => (
                                <div 
                                    key={client._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, client._id)}
                                    className="bg-crm-bg border border-crm-border p-3 rounded-lg cursor-grab active:cursor-grabbing hover:border-crm-red/50 transition-colors"
                                >
                                    <p className="text-sm font-bold text-crm-fg mb-1">{client.firstName} {client.lastName}</p>
                                    <p className="text-xs text-crm-fg-muted mb-2 line-clamp-1">{client.vehicleOfInterest || 'Sin vehículo'}</p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-crm-border/50">
                                        <span className="text-[10px] text-crm-fg-muted">{client.phone || client.email}</span>
                                        <span className="text-[10px] text-crm-fg-muted bg-crm-surface px-1.5 py-0.5 rounded">
                                            {client.reason === 'entro_puerta' ? 'Local' : 'Digital'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
