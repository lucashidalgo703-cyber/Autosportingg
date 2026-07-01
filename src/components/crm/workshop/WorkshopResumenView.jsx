"use client";

import React from 'react';
import { Wrench, Clock, CheckCircle2, AlertCircle, TrendingUp, BarChart3, User, Award } from 'lucide-react';

export default function WorkshopResumenView({ orders = [] }) {
    // 1. Calculations
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => !['entregado', 'cancelado'].includes(o.status));
    const finishedOrders = orders.filter(o => o.status === 'entregado');
    const cancelledOrders = orders.filter(o => o.status === 'cancelado');

    // Mapped statuses grouping
    const statusCounts = {
        ingresado: orders.filter(o => o.status === 'ingresado').length,
        cotizando: orders.filter(o => ['cotizando', 'esperando_aprobacion'].includes(o.status)).length,
        aprobado: orders.filter(o => o.status === 'aprobado').length,
        en_taller: orders.filter(o => ['enviado_proveedor', 'en_trabajo', 'terminado_proveedor', 'recibido'].includes(o.status)).length,
        listo: orders.filter(o => o.status === 'listo').length,
    };

    // Calculate average days in workshop for active orders
    const getAvgDays = () => {
        if (activeOrders.length === 0) return 0;
        const now = new Date();
        const totalDays = activeOrders.reduce((sum, o) => {
            const entryDate = o.admissionDate ? new Date(o.admissionDate) : new Date(o.createdAt);
            const diffTime = Math.abs(now - entryDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return sum + diffDays;
        }, 0);
        return (totalDays / activeOrders.length).toFixed(1);
    };

    // Top workshops (providers)
    const providerStats = {};
    orders.forEach(o => {
        const provName = o.providerId?.name || 'Sin Asignar';
        providerStats[provName] = (providerStats[provName] || 0) + 1;
    });
    const topProviders = Object.entries(providerStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Top mechanics (assignedTo)
    const mechanicStats = {};
    orders.forEach(o => {
        const mechName = o.assignedTo?.name || 'Sin Asignar';
        mechanicStats[mechName] = (mechanicStats[mechName] || 0) + 1;
    });
    const topMechanics = Object.entries(mechanicStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Card 1: Total Orders */}
                <div className="relative overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm transition-all hover:border-crm-border-hover">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Órdenes Totales</span>
                            <h3 className="m-0 mt-1 text-2xl font-black text-crm-fg">{totalOrders}</h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-crm-info/10 text-crm-info">
                            <Wrench size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-crm-fg-muted">
                        <span className="font-bold text-crm-fg">{activeOrders.length}</span> activas en este momento
                    </div>
                </div>

                {/* Card 2: Avg Days */}
                <div className="relative overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm transition-all hover:border-crm-border-hover">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Estadía Promedio</span>
                            <h3 className="m-0 mt-1 text-2xl font-black text-crm-fg">{getAvgDays()} días</h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-crm-warning/10 text-crm-warning">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-crm-fg-muted">
                        Medido desde la fecha de ingreso
                    </div>
                </div>

                {/* Card 3: Finished */}
                <div className="relative overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm transition-all hover:border-crm-border-hover">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Entregados / Listos</span>
                            <h3 className="m-0 mt-1 text-2xl font-black text-crm-fg">{finishedOrders.length + statusCounts.listo}</h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-crm-success/10 text-crm-success">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-crm-fg-muted">
                        <span className="font-bold text-crm-success">{finishedOrders.length}</span> entregados con éxito
                    </div>
                </div>

                {/* Card 4: Cancelled */}
                <div className="relative overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm transition-all hover:border-crm-border-hover">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Cancelaciones</span>
                            <h3 className="m-0 mt-1 text-2xl font-black text-crm-fg">{cancelledOrders.length}</h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-crm-red/10 text-crm-red">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-crm-fg-muted">
                        Tasa de rechazo: <span className="font-bold text-crm-red">{totalOrders > 0 ? ((cancelledOrders.length / totalOrders) * 100).toFixed(1) : 0}%</span>
                    </div>
                </div>
            </div>

            {/* Distribution and Lists Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Column 1: Status Distribution */}
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm lg:col-span-1">
                    <h3 className="m-0 mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                        <BarChart3 size={16} className="text-crm-red" />
                        Distribución de Órdenes
                    </h3>
                    <div className="space-y-3.5">
                        {[
                            { label: 'Ingresados', count: statusCounts.ingresado, color: 'bg-blue-500' },
                            { label: 'Cotizando / En Espera', count: statusCounts.cotizando, color: 'bg-yellow-500' },
                            { label: 'Aprobados', count: statusCounts.aprobado, color: 'bg-green-500' },
                            { label: 'En Taller / Reparando', count: statusCounts.en_taller, color: 'bg-purple-500' },
                            { label: 'Listos para Retiro', count: statusCounts.listo, color: 'bg-teal-500' }
                        ].map((item, idx) => {
                            const pct = activeOrders.length > 0 ? ((item.count / activeOrders.length) * 100).toFixed(0) : 0;
                            return (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-crm-fg-muted">{item.label}</span>
                                        <span className="text-crm-fg">{item.count} ({pct}%)</span>
                                    </div>
                                    <div className="h-2 w-full bg-crm-bg rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Column 2: Top Providers */}
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm">
                    <h3 className="m-0 mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                        <Award size={16} className="text-crm-red" />
                        Talleres con Mayor Carga
                    </h3>
                    <div className="space-y-3.5">
                        {topProviders.length === 0 ? (
                            <div className="text-center py-8 text-xs text-crm-fg-muted">Sin datos de proveedores</div>
                        ) : (
                            topProviders.map(([name, count], idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-crm-border/30 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-crm-fg-muted">#{idx + 1}</span>
                                        <span className="text-xs font-bold text-crm-fg">{name}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-crm-bg border border-crm-border px-2.5 py-0.5 rounded text-crm-fg">
                                        {count} {count === 1 ? 'orden' : 'órdenes'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Column 3: Top Mechanics */}
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5 shadow-sm">
                    <h3 className="m-0 mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                        <User size={16} className="text-crm-red" />
                        Operarios / Responsables
                    </h3>
                    <div className="space-y-3.5">
                        {topMechanics.length === 0 ? (
                            <div className="text-center py-8 text-xs text-crm-fg-muted">Sin operarios asignados</div>
                        ) : (
                            topMechanics.map(([name, count], idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-crm-border/30 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-crm-fg-muted">#{idx + 1}</span>
                                        <span className="text-xs font-bold text-crm-fg">{name}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-crm-bg border border-crm-border px-2.5 py-0.5 rounded text-crm-fg">
                                        {count} {count === 1 ? 'orden' : 'órdenes'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
