import React, { useState } from 'react';
import { Car, User, DollarSign, Calendar, Edit2, Trash2, ChevronDown } from 'lucide-react';

export default function PedidosMobileCards({ data, onEdit, onDelete }) {
    const [expandedId, setExpandedId] = useState(data[0]?._id || null);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendiente': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'Buscando': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'Encontrado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'Cancelado': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'Completado': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    const isOverdue = (date) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    if (data.length === 0) {
        return (
            <div className="py-12 text-center text-crm-fg-muted border border-dashed border-crm-border rounded-xl">
                No se encontraron pedidos activos.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {data.map(pedido => {
                const isExpanded = expandedId === pedido._id;
                const overdue = isOverdue(pedido.nextActionDate) && pedido.status !== 'Completado' && pedido.status !== 'Cancelado';
                
                return (
                    <div key={pedido._id} className={`flex flex-col rounded-xl border bg-crm-surface transition-all ${overdue ? 'border-red-500/50' : 'border-crm-border hover:border-crm-red/50'}`}>
                        <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : pedido._id)}
                            className="m-0 flex w-full appearance-none items-center justify-between gap-3 border-0 bg-transparent px-4 py-4 text-left text-crm-fg"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-bg border border-crm-border">
                                    <Car size={20} className={overdue ? 'text-red-400' : 'text-crm-fg-muted'} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="m-0 truncate text-sm font-bold leading-tight text-white">
                                        {pedido.requestedBrand} {pedido.requestedModel}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(pedido.status)}`}>
                                            {pedido.status}
                                        </span>
                                        {overdue && <span className="text-[10px] text-red-400 font-bold uppercase">Vencido</span>}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown size={18} className={`shrink-0 text-crm-fg-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExpanded && (
                            <div className="border-t border-crm-border bg-crm-bg/40 p-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-y-3 text-xs text-crm-fg-muted mb-4">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-crm-fg opacity-70" />
                                        <span className="font-medium text-crm-fg">{pedido.clientName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">📱</span>
                                        <a href={`https://wa.me/${pedido.clientPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-crm-red transition-colors">{pedido.clientPhone}</a>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-crm-fg opacity-70" />
                                        <span>{pedido.yearRange || 'Cualquiera'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={14} className="text-crm-fg opacity-70" />
                                        <span className="font-medium text-crm-fg">{pedido.currency} {pedido.budget?.toLocaleString('es-AR') || 'Sin límite'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-3 text-xs text-crm-fg-muted mb-4 pt-3 border-t border-crm-border">
                                    <div>
                                        <span className="block font-semibold mb-0.5">Asignado a:</span>
                                        <span className="text-crm-fg">{pedido.assignedTo?.name || 'Sin asignar'}</span>
                                    </div>
                                    <div>
                                        <span className="block font-semibold mb-0.5">Próx. Acción:</span>
                                        <span className={overdue ? 'text-red-400 font-bold' : 'text-crm-fg'}>
                                            {pedido.nextActionDate ? new Date(pedido.nextActionDate).toLocaleDateString() : 'Sin fecha'}
                                        </span>
                                    </div>
                                </div>

                                {pedido.notes && (
                                    <div className="mb-4 rounded-lg bg-crm-bg p-3 text-xs italic text-crm-fg-muted border border-crm-border/50">
                                        {pedido.notes}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 border-t border-crm-border pt-4">
                                    <button onClick={() => onEdit(pedido)} className="flex items-center gap-1 text-xs font-semibold text-crm-fg bg-crm-surface-raised px-3 py-1.5 rounded-lg hover:bg-crm-border transition-colors">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <button onClick={() => onDelete(pedido._id)} className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg hover:bg-red-400/20 transition-colors">
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
