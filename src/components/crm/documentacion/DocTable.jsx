import React from 'react';
import Link from 'next/link';
import { Target, FileText, CheckCircle2, AlertCircle, Clock, Truck, MoreVertical, Eye } from 'lucide-react';

const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency || 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
};

export default function DocTable({ sales, getSaleTaskStatus, onCreateTask }) {
    if (!sales || sales.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-[#161619] border border-crm-border rounded-2xl text-center">
                <FileText size={48} className="text-[#33333A] mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No hay ventas operativas</h3>
                <p className="text-crm-fg-muted">Ajustá los filtros o generá una nueva venta.</p>
            </div>
        );
    }

    const getDocStatusBadge = (status) => {
        switch (status) {
            case 'completo':
                return <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase">Completa</span>;
            case 'parcial':
                return <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold uppercase">Parcial</span>;
            default:
                return <span className="px-2 py-1 rounded-md bg-crm-red/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">Pendiente</span>;
        }
    };

    const getDeliveryStatusBadge = (status) => {
        switch (status) {
            case 'entregado':
                return <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">Entregado</span>;
            case 'listo_para_entregar':
                return <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase">Lista</span>;
            case 'preparando':
                return <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold uppercase">Preparando</span>;
            default:
                return <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold uppercase">Pendiente</span>;
        }
    };

    return (
        <div className="hidden md:block overflow-x-auto bg-[#161619] border border-crm-border rounded-2xl mb-6">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-crm-border bg-[#1E1E24]">
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Fecha / ID</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Cliente</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Vehículo</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Documentación</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Entrega</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Seguimiento</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#33333A]">
                    {sales.map((sale) => {
                        const pendingTasks = getSaleTaskStatus(sale._id);
                        const hasPendingTasks = pendingTasks && pendingTasks.length > 0;
                        
                        return (
                            <tr key={sale._id} className="hover:bg-[#1E1E24] transition-colors group">
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium text-white">
                                            {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="text-[10px] text-crm-fg-muted font-mono bg-black/20 px-1.5 py-0.5 rounded w-fit">
                                            {sale._id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                </td>
                                
                                <td className="p-4">
                                    <div className="text-sm font-bold text-white">
                                        {sale.clientId?.fullName || sale.clientId?.firstName || 'Sin Cliente'}
                                    </div>
                                    <div className="text-xs text-crm-fg-muted">
                                        {sale.clientId?.phone || 'Sin teléfono'}
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="text-sm font-bold text-white">
                                        {sale.vehicleId?.brand} {sale.vehicleId?.name}
                                    </div>
                                    <div className="text-xs text-crm-fg-muted uppercase">
                                        {sale.vehicleId?.plateOrVin || 'Sin Patente'}
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="flex flex-col gap-2 items-start">
                                        {getDocStatusBadge(sale.documentationStatus)}
                                        {sale.documentationChecklist && sale.documentationChecklist.length > 0 && (
                                            <div className="text-[10px] text-neutral-400">
                                                {sale.documentationChecklist.filter(c => c.completed).length} / {sale.documentationChecklist.length} docs
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="flex flex-col gap-2 items-start">
                                        {getDeliveryStatusBadge(sale.deliveryStatus)}
                                        {sale.estimatedDeliveryDate && (
                                            <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(sale.estimatedDeliveryDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                <td className="p-4">
                                    {hasPendingTasks ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                                                <AlertCircle size={12} /> Tarea Pendiente
                                            </span>
                                            <span className="text-[10px] text-neutral-500">
                                                {pendingTasks[0].title}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-neutral-500">Sin seguimiento</span>
                                    )}
                                </td>

                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => onCreateTask(sale, 'documentacion')}
                                            className="p-2 text-neutral-400 hover:text-white hover:bg-crm-surface-raised rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                                            title="Crear tarea documentación"
                                        >
                                            <FileText size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onCreateTask(sale, 'entrega')}
                                            className="p-2 text-neutral-400 hover:text-white hover:bg-crm-surface-raised rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                                            title="Crear tarea entrega"
                                        >
                                            <Truck size={16} />
                                        </button>
                                        <Link 
                                            href={`/admin/ventas/${sale._id}`}
                                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors border border-transparent bg-blue-500/10"
                                            title="Ir a Expediente"
                                        >
                                            <Eye size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
