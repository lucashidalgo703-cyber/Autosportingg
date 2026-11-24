// src/components/crm/stock/rotation/StrategicRotationTable.jsx
"use client";

import React, { useState, useMemo } from 'react';
import {
    Search,
    Filter,
    Clock,
    AlertTriangle,
    ShieldAlert,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    Eye,
    Percent,
    Sparkles,
    CheckCircle2,
    Users,
    ArrowUpDown
} from 'lucide-react';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function StrategicRotationTable({ vehicles = [], onSelectVehicle, activeCurrency = 'ARS' }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [agingFilter, setAgingFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [participationFilter, setParticipationFilter] = useState('all');
    const [sortField, setSortField] = useState('priorityScore');
    const [sortAsc, setSortAsc] = useState(false);

    // Filtrado interactivo
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            // Moneda (por defecto solo la moneda activa o ambas si se desea)
            if (activeCurrency && v.currency !== activeCurrency) return false;

            // Búsqueda por texto
            if (searchTerm.trim()) {
                const term = searchTerm.trim().toLowerCase();
                const text = `${v.brand || ''} ${v.name || ''} ${v.plate || ''} ${v.year || ''}`.toLowerCase();
                if (!text.includes(term)) return false;
            }

            // Antigüedad
            if (agingFilter !== 'all' && v.agingClass?.key !== agingFilter) {
                return false;
            }

            // Estado comercial
            if (statusFilter !== 'all' && v.status !== statusFilter) {
                return false;
            }

            // Prioridad
            if (priorityFilter !== 'all' && v.priorityTier?.toLowerCase() !== priorityFilter.toLowerCase()) {
                return false;
            }

            // Participación
            if (participationFilter === 'agency' && v.participation?.hasPartner) return false;
            if (participationFilter === 'shared' && !v.participation?.hasPartner) return false;

            return true;
        });
    }, [vehicles, activeCurrency, searchTerm, agingFilter, statusFilter, priorityFilter, participationFilter]);

    // Ordenamiento interactivo
    const sortedVehicles = useMemo(() => {
        const sorted = [...filteredVehicles];
        sorted.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'aging') {
                valA = a.daysInStock || 0;
                valB = b.daysInStock || 0;
            } else if (sortField === 'capital') {
                valA = a.capitalOwnInvested || 0;
                valB = b.capitalOwnInvested || 0;
            } else if (sortField === 'priority') {
                valA = a.priorityScore || 0;
                valB = b.priorityScore || 0;
            } else if (sortField === 'price') {
                valA = a.price || 0;
                valB = b.price || 0;
            } else if (sortField === 'margin') {
                valA = a.marginOnCostPct || 0;
                valB = b.marginOnCostPct || 0;
            }

            if (typeof valA === 'string') {
                return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortAsc ? (valA - valB) : (valB - valA);
        });
        return sorted;
    }, [filteredVehicles, sortField, sortAsc]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    return (
        <div className="space-y-4">
            
            {/* Controles de Filtros */}
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crm-border/60 pb-3">
                    <div className="flex items-center gap-2">
                        <Filter size={15} className="text-purple-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                            Filtros de Prioridad Estratégica:
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                        <span className="text-crm-fg-muted font-sans text-[11px]">Mostrando:</span>
                        <strong className="text-white font-bold">{sortedVehicles.length}</strong>
                        <span className="text-crm-fg-subtle">de {vehicles.filter(v => v.currency === activeCurrency).length} unidades ({activeCurrency})</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    
                    {/* Búsqueda */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-crm-fg-muted" />
                        <input
                            type="text"
                            placeholder="Buscar por marca, modelo o patente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg pl-9 pr-3 text-xs text-white placeholder-crm-fg-subtle focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Filtro por Antigüedad */}
                    <div>
                        <select
                            value={agingFilter}
                            onChange={(e) => setAgingFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
                        >
                            <option value="all">Antigüedad: Todos los rangos</option>
                            <option value="saludable">0 a 30 días (Saludable)</option>
                            <option value="seguimiento">31 a 60 días (Seguimiento)</option>
                            <option value="atencion">61 a 90 días (Atención)</option>
                            <option value="revision_prioritaria">+90 días (Revisión prioritaria)</option>
                        </select>
                    </div>

                    {/* Filtro por Prioridad Comercial */}
                    <div>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
                        >
                            <option value="all">Prioridad: Todos los niveles</option>
                            <option value="urgente">Urgente (Score 80-100)</option>
                            <option value="alta">Alta (Score 60-79)</option>
                            <option value="media">Media (Score 40-59)</option>
                            <option value="baja">Baja (Score 0-39)</option>
                        </select>
                    </div>

                    {/* Filtro por Estado Comercial */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
                        >
                            <option value="all">Estado: Todos</option>
                            <option value="Disponible">Disponible</option>
                            <option value="Reservado">Reservado</option>
                            <option value="Pausado">Pausado</option>
                        </select>
                    </div>

                    {/* Filtro por Participación */}
                    <div>
                        <select
                            value={participationFilter}
                            onChange={(e) => setParticipationFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
                        >
                            <option value="all">Participación: Todo</option>
                            <option value="agency">100% Agencia (Propio)</option>
                            <option value="shared">Con Socios / Inversionista</option>
                        </select>
                    </div>

                </div>
            </div>

            {/* TABLA PRINCIPAL DE ROTACIÓN */}
            <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-surface custom-scrollbar shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="border-b border-crm-border bg-crm-bg/90 text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                            <th className="p-3">Vehículo</th>
                            <th 
                                className="p-3 text-center cursor-pointer hover:text-white"
                                onClick={() => handleSort('aging')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Antigüedad <ArrowUpDown size={11} />
                                </span>
                            </th>
                            <th 
                                className="p-3 text-right cursor-pointer hover:text-white"
                                onClick={() => handleSort('capital')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Capital Propio <ArrowUpDown size={11} />
                                </span>
                            </th>
                            <th 
                                className="p-3 text-right cursor-pointer hover:text-white"
                                onClick={() => handleSort('price')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Precio Lista <ArrowUpDown size={11} />
                                </span>
                            </th>
                            <th className="p-3 text-center">Referencia Mercado</th>
                            <th className="p-3 text-center">Dif. % Mercado</th>
                            <th 
                                className="p-3 text-center cursor-pointer hover:text-white"
                                onClick={() => handleSort('margin')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Rent. Proyectada <ArrowUpDown size={11} />
                                </span>
                            </th>
                            <th 
                                className="p-3 text-center cursor-pointer hover:text-white"
                                onClick={() => handleSort('priority')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    Prioridad <ArrowUpDown size={11} />
                                </span>
                            </th>
                            <th className="p-3">Recomendación Estratégica</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border/60 font-mono">
                        {sortedVehicles.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-12 text-center text-crm-fg-muted font-sans">
                                    No se encontraron unidades en stock con los filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            sortedVehicles.map((v) => {
                                const cur = v.currency;
                                const isCritical = v.daysInStock >= 91;
                                const isAttention = v.daysInStock >= 61 && v.daysInStock <= 90;

                                return (
                                    <tr 
                                        key={v.carId} 
                                        className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${
                                            isCritical ? 'bg-red-500/[0.03]' : isAttention ? 'bg-amber-500/[0.02]' : ''
                                        }`}
                                        onClick={() => onSelectVehicle(v)}
                                    >
                                        
                                        {/* 1. Vehículo */}
                                        <td className="p-3 font-sans">
                                            <p className="font-bold text-white text-sm">
                                                {v.brand} {v.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-crm-fg-muted pt-0.5">
                                                <span>Año {v.year}</span>
                                                {v.plate && (
                                                    <span className="font-mono bg-crm-bg px-1.5 py-0.2 rounded border border-crm-border text-white">
                                                        {v.plate}
                                                    </span>
                                                )}
                                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                                    v.status === 'Disponible' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    v.status === 'Reservado' ? 'bg-amber-500/20 text-amber-300' :
                                                    'bg-gray-500/20 text-gray-300'
                                                }`}>
                                                    {v.status}
                                                </span>
                                                {v.participation?.hasPartner && (
                                                    <span className="text-purple-300 font-bold">
                                                        [Socio {v.participation.partnerPercentage}%]
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 2. Días en Stock */}
                                        <td className="p-3 text-center font-sans">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                                v.agingClass.key === 'revision_prioritaria'
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    : v.agingClass.key === 'atencion'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    : v.agingClass.key === 'seguimiento'
                                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                                <Clock size={11} /> {v.daysInStock} d.
                                            </span>
                                            <span className="block text-[10px] text-crm-fg-subtle pt-0.5">
                                                {v.agingClass.label}
                                            </span>
                                        </td>

                                        {/* 3. Capital Propio Inmovilizado */}
                                        <td className="p-3 text-right">
                                            <strong className="text-emerald-400 font-bold block">
                                                {formatMoney(v.capitalOwnInvested, cur)}
                                            </strong>
                                            <span className="text-[10px] text-crm-fg-muted font-sans block">
                                                Total costo: {formatMoney(v.totalEconomicCost, cur)}
                                            </span>
                                        </td>

                                        {/* 4. Precio Publicado */}
                                        <td className="p-3 text-right text-white font-bold">
                                            {formatMoney(v.price, cur)}
                                        </td>

                                        {/* 5. Referencia de Mercado */}
                                        <td className="p-3 text-center">
                                            {v.hasMarketEvidence && v.marketMedian ? (
                                                <div>
                                                    <span className="font-bold text-white block">
                                                        {formatMoney(v.marketMedian, cur)}
                                                    </span>
                                                    <span className="text-[10px] text-crm-fg-muted font-sans block">
                                                        Rango: {formatMoney(v.marketMin, cur)} - {formatMoney(v.marketMax, cur)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-crm-fg-subtle font-sans italic">
                                                    Sin comparables
                                                </span>
                                            )}
                                        </td>

                                        {/* 6. Diferencia % vs Mercado */}
                                        <td className="p-3 text-center font-sans">
                                            {v.hasMarketEvidence && v.priceDifferenceVsMarket !== null ? (
                                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-black font-mono ${
                                                    v.priceDifferenceVsMarket > 8 ? 'text-red-400 bg-red-500/10' :
                                                    v.priceDifferenceVsMarket > 0 ? 'text-amber-300 bg-amber-500/10' :
                                                    'text-emerald-400 bg-emerald-500/10'
                                                }`}>
                                                    {v.priceDifferenceVsMarket > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                    {v.priceDifferenceVsMarket > 0 ? `+${v.priceDifferenceVsMarket}%` : `${v.priceDifferenceVsMarket}%`}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-crm-fg-subtle font-sans">-</span>
                                            )}
                                        </td>

                                        {/* 7. Rentabilidad Proyectada */}
                                        <td className="p-3 text-center">
                                            <strong className={`block text-xs font-bold ${
                                                v.marginOnCostPct >= 15 ? 'text-emerald-400' :
                                                v.marginOnCostPct >= 8 ? 'text-cyan-400' :
                                                'text-amber-300'
                                            }`}>
                                                {v.marginOnCostPct}% s/ costo
                                            </strong>
                                            <span className="text-[10px] text-crm-fg-muted block font-mono">
                                                {formatMoney(v.projectedNetProfit, cur)}
                                            </span>
                                        </td>

                                        {/* 8. Prioridad Comercial */}
                                        <td className="p-3 text-center font-sans">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                                v.priorityTier === 'Urgente'
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    : v.priorityTier === 'Alta'
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    : v.priorityTier === 'Media'
                                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                                {v.priorityTier} ({v.priorityScore} pts)
                                            </span>
                                            <span className="block text-[10px] text-crm-fg-subtle pt-0.5">
                                                {v.urgencyLabel}
                                            </span>
                                        </td>

                                        {/* 9. Recomendación Estratégica */}
                                        <td className="p-3 font-sans">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                                v.recommendation?.badge === 'red' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                                                v.recommendation?.badge === 'amber' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                                                v.recommendation?.badge === 'cyan' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                                                'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                            }`}>
                                                {v.recommendation?.actionLabel}
                                            </span>
                                            <p className="text-[10px] text-crm-fg-muted truncate max-w-xs pt-0.5">
                                                {v.recommendation?.motive}
                                            </p>
                                        </td>

                                        {/* 10. Acciones */}
                                        <td className="p-3 text-center font-sans" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => onSelectVehicle(v)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-crm-border bg-crm-bg text-xs font-bold text-white hover:bg-purple-600 transition-colors shadow-sm"
                                            >
                                                <Eye size={13} />
                                                <span>Ficha</span>
                                            </button>
                                        </td>

                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
