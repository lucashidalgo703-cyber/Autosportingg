"use client";
import React, { useEffect, useState } from 'react';
import { FolderOpen, Search, Filter, AlertCircle, FileText, Calendar, Car, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAdminSales } from '../../../hooks/useAdminSales';

export default function ExpedientesPage() {
    const { sales, loading, error, fetchSales } = useAdminSales();
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('activos');
    const [filterSeller, setFilterSeller] = useState('todos');
    const [filterResponsible, setFilterResponsible] = useState('todos');
    const [filterDueDate, setFilterDueDate] = useState('todos');

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const expedientes = sales.filter(sale => {
        if (sale.status === 'cancelada' || sale.status === 'borrador') return false;
        
        let matchesStatus = true;
        if (filterStatus === 'activos') {
            matchesStatus = sale.expedienteStatus !== 'entregado' && sale.expedienteStatus !== 'cancelado';
        } else if (filterStatus === 'demorados') {
            matchesStatus = sale.expedienteStatus === 'observado';
        } else if (filterStatus === 'cerrados') {
            matchesStatus = sale.expedienteStatus === 'entregado';
        } else if (filterStatus !== 'todos') {
            matchesStatus = sale.expedienteStatus === filterStatus;
        }

        let matchesSeller = true;
        if (filterSeller !== 'todos') {
            matchesSeller = sale.assignedTo?._id === filterSeller || sale.assignedTo === filterSeller;
        }

        let matchesResponsible = true;
        if (filterResponsible !== 'todos') {
            matchesResponsible = sale.expedienteResponsible?._id === filterResponsible || sale.expedienteResponsible === filterResponsible;
        }

        let matchesDueDate = true;
        if (filterDueDate === 'vencidos') {
            matchesDueDate = sale.expedienteDueDate && new Date(sale.expedienteDueDate) < new Date();
        } else if (filterDueDate === 'proximos_7_dias') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const today = new Date();
            matchesDueDate = sale.expedienteDueDate && new Date(sale.expedienteDueDate) >= today && new Date(sale.expedienteDueDate) <= nextWeek;
        }

        return matchesStatus && matchesSeller && matchesResponsible && matchesDueDate;
    });

    const filteredExpedientes = expedientes.filter(sale => {
        const query = search.toLowerCase();
        const clientName = ((sale.clientId?.fullName || sale.clientId?.firstName || '').toLowerCase()) || '';
        const carName = `${sale.vehicleId?.brand} ${sale.vehicleId?.name}`.toLowerCase();
        const plate = sale.vehicleId?.plateOrVin?.toLowerCase() || '';
        const document = sale.clientId?.documentNumber?.toLowerCase() || '';
        const phone = sale.clientId?.phone?.toLowerCase() || '';
        const gestor = sale.expedienteResponsible?.name?.toLowerCase() || sale.expedienteResponsible?.firstName?.toLowerCase() || '';
        const seller = sale.salesperson?.toLowerCase() || sale.assignedTo?.name?.toLowerCase() || sale.assignedTo?.firstName?.toLowerCase() || '';
        const owner = sale.vehicleOwnerName?.toLowerCase() || '';

        return clientName.includes(query) || carName.includes(query) || plate.includes(query) || document.includes(query) || phone.includes(query) || gestor.includes(query) || seller.includes(query) || owner.includes(query);
    });

    const sellers = Array.from(new Set(sales.map(s => s.assignedTo?._id).filter(Boolean)))
        .map(id => sales.find(s => s.assignedTo?._id === id).assignedTo);
    
    const responsibles = Array.from(new Set(sales.map(s => s.expedienteResponsible?._id).filter(Boolean)))
        .map(id => sales.find(s => s.expedienteResponsible?._id === id).expedienteResponsible);

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

    const getExpedienteStatusColor = (status) => {
        switch (status) {
            case 'listo': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'entregado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'en_proceso': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'transferido': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
            case 'finalizado': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'observado': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'cancelado': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
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
                            <option value="todos">Todos los Estados</option>
                            <option value="activos">Expedientes Activos</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="observado">Observado</option>
                            <option value="listo">Listo</option>
                            <option value="transferido">Transferido</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div className="relative">
                        <select 
                            value={filterSeller}
                            onChange={(e) => setFilterSeller(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-surface px-3 pr-8 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none"
                        >
                            <option value="todos">Cualquier Vendedor</option>
                            {sellers.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <select 
                            value={filterResponsible}
                            onChange={(e) => setFilterResponsible(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-surface px-3 pr-8 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none"
                        >
                            <option value="todos">Cualquier Responsable</option>
                            {responsibles.map(r => (
                                <option key={r._id} value={r._id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <select 
                            value={filterDueDate}
                            onChange={(e) => setFilterDueDate(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-surface px-3 pr-8 text-sm text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red appearance-none"
                        >
                            <option value="todos">Todas las Fechas</option>
                            <option value="vencidos">Vencidos</option>
                            <option value="proximos_7_dias">Próx. 7 Días</option>
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
                    {filteredExpedientes.map(sale => {
                        const isOverdue = sale.expedienteDueDate && new Date(sale.expedienteDueDate) < new Date();
                        
                        return (
                        <div key={sale._id} className={`flex flex-col justify-between rounded-xl border bg-crm-surface p-5 transition-all ${isOverdue ? 'border-red-500/50' : 'border-crm-border hover:border-crm-red/50'}`}>
                            <div>
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-white truncate max-w-[200px]">
                                            {sale.clientId ? (
                                                <Link href={`/admin/clientes/${sale.clientId._id}`} className="hover:text-crm-red hover:underline">
                                                    {sale.clientId.fullName || sale.clientId.firstName}
                                                </Link>
                                            ) : 'Cliente desconocido'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-sm text-crm-fg-muted">
                                            <Car size={14} />
                                            {sale.vehicleId ? (
                                                <Link href={`/admin/stock/${sale.vehicleId._id}`} className="truncate max-w-[180px] hover:text-crm-red hover:underline">
                                                    {sale.vehicleId.brand} {sale.vehicleId.name}
                                                </Link>
                                            ) : (
                                                <span className="truncate max-w-[180px]">Vehículo desconocido</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-xs font-bold text-crm-fg-muted bg-crm-bg px-2 py-1 rounded border border-crm-border">
                                            #{sale._id.slice(-6).toUpperCase()}
                                        </span>
                                        {isOverdue && (
                                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Vencido</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-3 mt-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-crm-fg-muted">
                                            <FolderOpen size={14} /> Estado Expediente
                                        </span>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getExpedienteStatusColor(sale.expedienteStatus)}`}>
                                            {sale.expedienteStatus?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    
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
                    )})}
                    
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
