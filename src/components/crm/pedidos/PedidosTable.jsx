import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import CrmTable from '../ui/CrmTable';

export default function PedidosTable({ data, onEdit, onDelete }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendiente': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'Buscando': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'Cumplido': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'Cancelado': return 'text-red-400 border-red-400/30 bg-red-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    const isOverdue = (date) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const columns = [
        {
            label: 'Vehículo Buscado',
            key: 'vehicle',
            render: (v) => (
                <div>
                    <div className="font-semibold text-white">{v.requestedBrand} {v.requestedModel}</div>
                    <div className="text-xs text-crm-fg-muted mt-0.5">Años: {v.yearRange || 'Cualquiera'}</div>
                </div>
            )
        },
        {
            label: 'Cliente',
            key: 'client',
            render: (v) => (
                <div>
                    <div className="font-medium text-crm-fg">{v.clientId?.fullName || v.clientName || 'Sin Nombre'}</div>
                    <div className="text-xs text-crm-fg-muted mt-0.5">{v.clientId?.phone || v.clientPhone || '--'}</div>
                </div>
            )
        },
        {
            label: 'Presupuesto',
            key: 'budget',
            render: (v) => v.budget ? `${v.currency} ${v.budget.toLocaleString('es-AR')}` : 'Sin límite'
        },
        {
            label: 'Estado',
            key: 'status',
            render: (v) => (
                <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(v.status)}`}>
                    {v.status}
                </span>
            )
        },
        {
            label: 'Próx. Acción',
            key: 'nextAction',
            render: (v) => {
                if (!v.nextActionDate) return '--';
                const dateStr = new Date(v.nextActionDate).toLocaleDateString();
                const overdue = isOverdue(v.nextActionDate) && v.status !== 'Cumplido' && v.status !== 'Cancelado';
                return (
                    <span className={`text-xs font-semibold ${overdue ? 'text-red-400' : 'text-crm-fg'}`}>
                        {dateStr} {overdue && '(Vencido)'}
                    </span>
                );
            }
        },
        {
            label: 'Asignado',
            key: 'assigned',
            render: (v) => v.assignedTo ? `${v.assignedTo.firstName || ''} ${v.assignedTo.lastName || ''}`.trim() || v.assignedTo.name : '--'
        },
        {
            label: 'Acciones',
            key: 'actions',
            render: (v) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(v)} className="m-0 appearance-none rounded-lg bg-transparent px-2 text-xs font-semibold text-crm-fg-muted hover:text-white transition-colors hover:bg-crm-surface-raised h-8">
                        Editar
                    </button>
                    <button onClick={() => onDelete(v._id)} className="m-0 appearance-none rounded-lg bg-transparent px-2 text-xs font-semibold text-crm-fg-muted hover:text-red-400 transition-colors hover:bg-crm-surface-raised h-8">
                        Borrar
                    </button>
                </div>
            )
        }
    ];

    if (data.length === 0) {
        return (
            <div className="py-12 text-center text-crm-fg-muted bg-crm-surface border border-crm-border rounded-xl">
                No se encontraron pedidos.
            </div>
        );
    }

    return <CrmTable columns={columns} data={data} />;
}
