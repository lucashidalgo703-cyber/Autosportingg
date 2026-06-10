"use client";
import React, { useEffect, useState } from 'react';
import { FolderOpen, Search, Filter, AlertCircle, FileText, Calendar, Car, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAdminSales } from '../../../hooks/useAdminSales';

export default function ExpedientesPage() {
    const { sales, loading, error, fetchSales } = useAdminSales();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('activos');

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    // Un Expediente activo es una Venta no cancelada que:
    // 1. Aún no se entregó (confirmada, pendiente_entrega)
    // 2. O ya se entregó pero faltan papeles (documentationStatus !== 'completo')
    const expedientes = sales.filter(sale => {
        if (sale.status === 'cancelada' || sale.status === 'borrador') return false;
        
        const isNotDelivered = sale.status === 'confirmada' || sale.status === 'pendiente_entrega';
        const isMissingDocs = sale.documentationStatus !== 'completo';
        
        if (filterStatus === 'activos') {
            return isNotDelivered || isMissingDocs;
        } else if (filterStatus === 'demorados') {
            // Ejemplo: documentación pendiente por mucho tiempo
            return isMissingDocs;
        } else if (filterStatus === 'cerrados') {
            return sale.status === 'entregada' && sale.documentationStatus === 'completo';
        }
        return true;
    });

    const filteredExpedientes = expedientes.filter(sale => {
        const query = search.toLowerCase();
        const clientName = sale.clientId?.name?.toLowerCase() || '';
        const carName = `${sale.vehicleId?.brand} ${sale.vehicleId?.name}`.toLowerCase();
        const plate = sale.vehicleId?.plateOrVin?.toLowerCase() || '';
        return clientName.includes(query) || carName.includes(query) || plate.includes(query);
    });

    const getDocStatusColor = (status) => {
        switch (status) {
            case 'completo': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'parcial': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            default: return 'text-red-400 border-red-400/30 bg-red-400/10';
        }
    };

    const getDeliveryStatusColor = (status) => {
        switch (status) {
            case 'entregado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'listo_para_entregar': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'preparando': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            default: return 'text-crm-fg-muted border-crm-border bg-crm-bg';
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg flex items-center gap-2">
                        <FolderOpen size={28} className="text-crm-red" />
                        Expedientes
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Seguimiento administrativo de ventas activas.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar cliente, vehículo, patente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-surface pl-9 pr-8 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none"
                        >
                            <option value="activos">Archivos Activos</option>
                            <option value="demorados">Faltan Papeles</option>
                            <option value="cerrados">Histórico Cerrados</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading && sales.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredExpedientes.map(sale => (
                        <div key={sale._id} className="flex flex-col justify-between rounded-xl border border-crm-border bg-crm-surface p-5 transition-all hover:border-crm-red/50">
                            <div>
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-white truncate max-w-[200px]">
                                            {sale.clientId?.name || 'Cliente desconocido'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-sm text-crm-fg-muted">
                                            <Car size={14} />
                                            <span className="truncate max-w-[180px]">{sale.vehicleId?.brand} {sale.vehicleId?.name}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-crm-fg-muted bg-crm-bg px-2 py-1 rounded border border-crm-border">
                                        #{sale._id.slice(-6).toUpperCase()}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col gap-3 mt-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-crm-fg-muted">
                                            <FileText size={14} /> Documentación
                                        </span>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getDocStatusColor(sale.documentationStatus)}`}>
                                            {sale.documentationStatus || 'Pendiente'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-crm-fg-muted">
                                            <Calendar size={14} /> Entrega Física
                                        </span>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getDeliveryStatusColor(sale.deliveryStatus)}`}>
                                            {sale.deliveryStatus?.replace(/_/g, ' ') || 'Pendiente'}
                                        </span>
                                    </div>

                                    {sale.tradeIns && sale.tradeIns.length > 0 && (
                                        <div className="mt-2 rounded bg-crm-bg p-2 border border-crm-border border-l-2 border-l-yellow-500">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-crm-fg">
                                                <AlertCircle size={12} className="text-yellow-500" />
                                                Tiene {sale.tradeIns.length} permuta(s) asociada(s)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Link href={`/admin/ventas/${sale._id}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-crm-bg py-2 text-sm font-bold text-white border border-crm-border hover:bg-crm-border hover:text-crm-red transition-all">
                                Abrir Expediente <ArrowRight size={14} />
                            </Link>
                        </div>
                    ))}
                    
                    {filteredExpedientes.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-crm-fg-muted">
                            <FolderOpen size={48} className="mb-4 opacity-20" />
                            <p>No hay expedientes en este estado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
