import React from 'react';
import Link from 'next/link';
import { Target, Star, Gift, Eye, Clock, AlertTriangle } from 'lucide-react';

export default function PostventaMobileCards({ sales, getSaleTaskStatus, onCreateTask, onUpdateChecklist, onUpdateStatus }) {
    if (!sales || sales.length === 0) {
        return (
            <div className="md:hidden flex flex-col items-center justify-center p-8 bg-crm-bg border border-crm-border rounded-2xl text-center">
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
        <div className="md:hidden flex flex-col gap-4">
            {sales.map(sale => {
                const pendingTasks = getSaleTaskStatus(sale._id);
                const hasPendingTasks = pendingTasks && pendingTasks.length > 0;
                const chk = sale.postSaleChecklist || {};
                const currentStatus = sale.postSaleStatus || 'pendiente';

                return (
                    <div key={sale._id} className="bg-crm-bg border border-crm-border rounded-2xl p-4 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-bold text-white mb-1">
                                    {sale.clientId?.fullName || sale.clientId?.firstName || 'Sin Cliente'}
                                </div>
                                <div className="text-xs text-crm-fg-muted">
                                    {sale.vehicleId?.brand} {sale.vehicleId?.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-crm-fg-muted mb-1">
                                    {sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString() : 'Sin fecha'}
                                </div>
                                <span className="text-[10px] text-crm-fg-muted font-mono bg-black/20 px-1.5 py-0.5 rounded">
                                    {sale._id.slice(-6).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Status Grid */}
                        <div className="flex items-center justify-between bg-crm-bg p-3 rounded-xl border border-crm-border">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase">Estado Postventa</span>
                                <div>{getStatusBadge(currentStatus)}</div>
                            </div>
                            <div className="flex flex-col gap-1.5 items-end">
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase">Satisfacción</span>
                                <div>{renderStars(sale.satisfactionRating)}</div>
                            </div>
                        </div>

                        {/* Checklist Shortcuts */}
                        <div className="flex gap-2 justify-center">
                            <button 
                                onClick={() => onUpdateChecklist(sale, 'seguimiento24h', !chk.seguimiento24h)}
                                className={`flex-1 py-1.5 rounded transition-colors border flex justify-center items-center ${chk.seguimiento24h ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                            >
                                <span className="text-[10px] font-bold">24H</span>
                            </button>
                            <button 
                                onClick={() => onUpdateChecklist(sale, 'seguimiento7d', !chk.seguimiento7d)}
                                className={`flex-1 py-1.5 rounded transition-colors border flex justify-center items-center ${chk.seguimiento7d ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                            >
                                <span className="text-[10px] font-bold">7D</span>
                            </button>
                            <button 
                                onClick={() => onUpdateChecklist(sale, 'resenaRecibida', !chk.resenaRecibida)}
                                className={`flex-1 py-1.5 rounded transition-colors border flex justify-center items-center ${chk.resenaRecibida ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                            >
                                <Star size={14} />
                            </button>
                            <button 
                                onClick={() => onUpdateChecklist(sale, 'obsequioEntregado', !chk.obsequioEntregado)}
                                className={`flex-1 py-1.5 rounded transition-colors border flex justify-center items-center ${chk.obsequioEntregado ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-transparent text-neutral-600 border-neutral-700 hover:text-white'}`}
                            >
                                <Gift size={14} />
                            </button>
                        </div>

                        {/* Seguimiento */}
                        <div className="flex flex-wrap gap-y-3 items-center justify-between border-t border-crm-border pt-3">
                            <div className="w-full xs:w-auto mb-2 xs:mb-0">
                                {hasPendingTasks ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                                            <Clock size={10} /> Tarea Pendiente
                                        </span>
                                        <span className="text-xs text-neutral-300">
                                            {pendingTasks[0].title}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-neutral-500">Sin seguimiento activo</span>
                                )}
                            </div>
                            <div className="flex gap-2 w-full xs:w-auto justify-end">
                                <select
                                    value={currentStatus}
                                    onChange={(e) => onUpdateStatus(sale, e.target.value)}
                                    className="bg-transparent border border-neutral-700 text-neutral-300 text-[10px] rounded px-2 hover:text-white focus:outline-none"
                                >
                                    <option value="pendiente">Pdte</option>
                                    <option value="contactado">Contac.</option>
                                    <option value="conforme">Conf.</option>
                                    <option value="incidencia">Incid.</option>
                                    <option value="cerrado">Cerrado</option>
                                </select>
                                <button 
                                    onClick={() => onCreateTask(sale)}
                                    className="w-8 h-8 rounded-lg bg-crm-surface-raised flex items-center justify-center text-neutral-400 border border-neutral-700"
                                >
                                    <Target size={14} />
                                </button>
                                <Link 
                                    href={`/admin/ventas/${sale._id}`}
                                    className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20"
                                >
                                    <Eye size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
