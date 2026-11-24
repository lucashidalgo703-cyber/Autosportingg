// src/components/crm/stock/rotation/SellerPriorityList.jsx
"use client";

import React, { useState } from 'react';
import {
    Flame,
    Tag,
    Clock,
    Search,
    ExternalLink,
    CheckCircle2
} from 'lucide-react';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function SellerPriorityList({ vehicles = [], summary = {} }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = vehicles.filter(v => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.trim().toLowerCase();
        const text = `${v.brand || ''} ${v.name || ''} ${v.plate || ''} ${v.year || ''}`.toLowerCase();
        return text.includes(term);
    });

    return (
        <div className="space-y-4">
            
            {/* Header del equipo de ventas */}
            <div className="p-4 rounded-2xl border border-purple-500/30 bg-crm-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs">
                            🎯
                        </span>
                        <h2 className="text-sm font-black uppercase tracking-wider text-white">
                            Directivas Comerciales & Prioridades de Stock
                        </h2>
                    </div>
                    <p className="text-xs text-crm-fg-muted">
                        Unidades autorizadas por la dirección para ofrecer activamente y priorizar en negociaciones comerciales.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-xl">
                        {summary.unitsRequiringAttentionCount || 0} unidades con prioridad comercial
                    </span>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative max-w-md">
                <Search size={14} className="absolute left-3 top-3 text-crm-fg-muted" />
                <input
                    type="text"
                    placeholder="Buscar vehículo por marca, modelo o patente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 rounded-xl border border-crm-border bg-crm-surface pl-9 pr-3 text-xs text-white placeholder-crm-fg-subtle focus:border-purple-500 focus:outline-none"
                />
            </div>

            {/* Listado de unidades */}
            <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-surface shadow-sm">
                <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-crm-bg/90 text-[10px] font-black uppercase text-crm-fg-muted border-b border-crm-border">
                        <tr>
                            <th className="p-3">Vehículo</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-right">Precio Comercial Autorizado</th>
                            <th className="p-3 text-center">Prioridad Comercial</th>
                            <th className="p-3">Enfoque Comercial Sugerido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border/60">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-crm-fg-muted italic">
                                    No hay vehículos que coincidan con la búsqueda.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((v) => (
                                <tr key={v.carId} className="hover:bg-white/[0.02]">
                                    
                                    {/* Vehículo */}
                                    <td className="p-3">
                                        <p className="font-bold text-white text-sm">
                                            {v.brand} {v.name} ({v.year})
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-crm-fg-muted font-mono pt-0.5">
                                            <span>{v.km?.toLocaleString('es-AR')} km</span>
                                            {v.plate && <span>• Patente: {v.plate}</span>}
                                            {v.color && <span>• Color: {v.color}</span>}
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            v.status === 'Disponible' ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-amber-500/20 text-amber-300'
                                        }`}>
                                            {v.status}
                                        </span>
                                    </td>

                                    {/* Precio Comercial Autorizado */}
                                    <td className="p-3 text-right font-mono font-bold text-white text-sm">
                                        {formatMoney(v.price, v.currency)}
                                    </td>

                                    {/* Prioridad Comercial */}
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                            v.priorityTier === 'Urgente'
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : v.priorityTier === 'Alta'
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                        }`}>
                                            {v.priorityTier}
                                        </span>
                                    </td>

                                    {/* Enfoque Comercial Sugerido */}
                                    <td className="p-3">
                                        <span className="font-bold text-white block text-[11px]">
                                            {v.commercialFocusTag}
                                        </span>
                                        <span className="text-[10px] text-crm-fg-muted block">
                                            {v.commercialActionSuggested}
                                        </span>
                                    </td>

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
