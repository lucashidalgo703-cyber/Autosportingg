import React from 'react';
import Link from 'next/link';
import { Target, Star, FileText, CheckCircle2, AlertCircle, Clock, Gift, Eye, MessageSquare, AlertTriangle } from 'lucide-react';

export default function PostventaTable({ sales, getSaleTaskStatus, onCreateTask, onUpdateChecklist, onUpdateStatus }) {
    if (!sales || sales.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-crm-bg border border-crm-border rounded-2xl text-center">
                <Star size={48} className="text-crm-border mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No hay operaciones en postventa</h3>
                <p className="text-crm-fg-muted">No hay ventas entregadas recientes o que coincidan con los filtros.</p>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'cerrado':
                return <span className="px-2 py-1 rounded-md bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 text-[10px] font-bold uppercase">Cerrado</span>;
            case 'conforme':
                return <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase">Conforme</span>;
            case 'incidencia':
                return <span className="px-2 py-1 rounded-md bg-crm-red/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">Incidencia</span>;
            case 'contactado':
                return <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">Contactado</span>;
            default:
                return <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold uppercase">Pendiente</span>;
        }
    };

    const renderStars = (rating) => {
        if (!rating) return <span className="text-[10px] text-neutral-500">Sin calificar</span>;
        return (
            <div className="flex gap-0.5 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill={i < rating ? "currentColor" : "transparent"} />
                ))}
            </div>
        );
    };

    return (
        <div className="hidden md:block overflow-x-auto bg-crm-bg border border-crm-border rounded-2xl mb-6">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-crm-border bg-crm-surface">
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Fecha Entrega</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Cliente</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Vehículo</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Estado</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Checklist</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Seguimiento</th>
                        <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-crm-border">
                    {sales.map((sale) => {
                        const pendingTasks = getSaleTaskStatus(sale._id);
                        const hasPendingTasks = pendingTasks && pendingTasks.length > 0;
                        const chk = sale.postSaleChecklist || {};
                        const currentStatus = sale.postSaleStatus || 'pendiente';
                        
                        return (
                            <tr key={sale._id} className="hover:bg-crm-surface transition-colors group">
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium text-white">
                                            {sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString() : 'Sin fecha'}
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
                                        {getStatusBadge(currentStatus)}
                                        {renderStars(sale.satisfactionRating)}
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => onUpdateChecklist(sale, 'seguimiento24h', !chk.seguimiento24h)}
                                            className={`p-1 rounded transition-colors border ${chk.seguimiento24h ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                                            title="Seguimiento 24h"
                                        >
                                            <span className="text-[9px] font-bold">24H</span>
                                        </button>
                                        <button 
                                            onClick={() => onUpdateChecklist(sale, 'seguimiento7d', !chk.seguimiento7d)}
                                            className={`p-1 rounded transition-colors border ${chk.seguimiento7d ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                                            title="Seguimiento 7d"
                                        >
                                            <span className="text-[9px] font-bold">7D</span>
                                        </button>
                                        <button 
                                            onClick={() => onUpdateChecklist(sale, 'resenaRecibida', !chk.resenaRecibida)}
                                            className={`p-1 rounded transition-colors border ${chk.resenaRecibida ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                                            title="Reseña Recibida"
                                        >
                                            <Star size={12} />
                                        </button>
                                        <button 
                                            onClick={() => onUpdateChecklist(sale, 'obsequioEntregado', !chk.obsequioEntregado)}
                                            className={`p-1 rounded transition-colors border ${chk.obsequioEntregado ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                                            title="Obsequio Entregado"
                                        >
                                            <Gift size={12} />
                                        </button>
                                    </div>
                                </td>

                                <td className="p-4">
                                    {hasPendingTasks ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                                                <Clock size={12} /> Tarea Pendiente
                                            </span>
                                            <span className="text-[10px] text-neutral-500 truncate max-w-[120px]" title={pendingTasks[0].title}>
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
                                            onClick={() => onCreateTask(sale)}
                                            className="p-2 text-neutral-400 hover:text-white hover:bg-crm-surface-raised rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                                            title="Agendar tarea"
                                        >
                                            <Target size={16} />
                                        </button>
                                        
                                        <select
                                            value={currentStatus}
                                            onChange={(e) => onUpdateStatus(sale, e.target.value)}
                                            className="bg-transparent border border-neutral-700 text-neutral-300 text-[10px] rounded p-1 hover:text-white focus:outline-none"
                                        >
                                            <option value="pendiente">Pendiente</option>
                                            <option value="contactado">Contactado</option>
                                            <option value="conforme">Conforme</option>
                                            <option value="incidencia">Incidencia</option>
                                            <option value="cerrado">Cerrado</option>
                                        </select>

                                        <Link 
                                            href={`/admin/ventas/${sale._id}`}
                                            className="p-2 text-pink-400 hover:text-white hover:bg-pink-600 rounded-lg transition-colors border border-transparent bg-pink-500/10"
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
