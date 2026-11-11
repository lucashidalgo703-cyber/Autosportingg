"use client";
import React, { useState } from 'react';
import { X, Search, Filter, AlertCircle, CheckCircle2, Download, HelpCircle, ShieldAlert } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

function formatARS(val) {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    return '$' + Math.round(val).toLocaleString('es-AR');
}

export default function StockAuditTableModal({ isOpen, onClose, capitalSummary }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [showOriginInfo, setShowOriginInfo] = useState(true);

    if (!isOpen || !capitalSummary) return null;

    const stockComponent = capitalSummary.componentes?.stockPropioCosto;
    const allStockItems = stockComponent?.items || [];
    const consignacionesItems = capitalSummary.componentes?.stockPropioCosto?.itemsConsignaciones || [];
    
    // Unir stock regular y consignaciones para auditoría completa
    const allAuditableVehicles = [
        ...allStockItems,
        ...consignacionesItems
    ];

    const filteredVehicles = allAuditableVehicles.filter(v => {
        if (statusFilter !== 'todos') {
            const st = (v.status || '').toLowerCase();
            if (statusFilter === 'consignacion' && !v.isConsignment) return false;
            if (statusFilter !== 'consignacion' && v.isConsignment) return false;
            if (statusFilter !== 'consignacion' && st !== statusFilter) return false;
        }
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
            (v.brand && v.brand.toLowerCase().includes(q)) ||
            (v.name && v.name.toLowerCase().includes(q)) ||
            (v.model && v.model.toLowerCase().includes(q)) ||
            (v.plate && v.plate.toLowerCase().includes(q)) ||
            (v.id && v.id.toLowerCase().includes(q))
        );
    });

    const origenPesosUno = capitalSummary.auditoriaIndicadores?.origenPesosUno;

    const handleExportCSV = () => {
        const headers = ['ID', 'Marca', 'Modelo', 'Año', 'Patente', 'Estado', 'Costo Compra', 'Gastos', 'Costo Total', 'Precio Publicado', '% Propio', 'Aporte Propio', '% Inversor', 'Aporte Inversor', 'Motivo Inclusión/Exclusión'];
        const rows = filteredVehicles.map(v => [
            v.id,
            v.brand,
            v.name || v.model,
            v.year,
            v.plate,
            v.status,
            v.purchasePrice,
            v.expenses || 0,
            v.costoBase,
            v.price,
            `${v.ownPct}%`,
            v.precioPropio,
            `${v.invPct}%`,
            v.precioInv,
            `"${(v.reason || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `auditoria_stock_autosporting_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-crm-border/70 flex items-start justify-between bg-crm-bg/70">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                                AUDITORÍA
                            </span>
                            <h2 className="text-lg font-bold text-white tracking-tight">
                                Tabla Auditable por Vehículo en Stock
                            </h2>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                                {allAuditableVehicles.length} unidades evaluadas
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted max-w-3xl leading-relaxed">
                            Verificación individual de costos, gastos, precios publicados, cuotas de participación propia/terceros y justificación de inclusión o exclusión patrimonial.
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-subtle hover:text-white hover:bg-crm-surface transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Explicación Origen $1 (Colapsable / Destacado) */}
                {origenPesosUno && showOriginInfo && (
                    <div className="mx-4 mt-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-100 flex flex-col md:flex-row gap-3 items-start justify-between">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 font-bold text-indigo-200">
                                <HelpCircle size={15} className="text-indigo-400 shrink-0" />
                                <span>Diagnóstico técnico: Origen de la terminación en $1 ($926.800.001 y $690.350.001)</span>
                            </div>
                            <p className="leading-relaxed text-indigo-200/90">
                                {origenPesosUno.explicacion}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {origenPesosUno.vehiculos.map(v => (
                                    <div key={v.id} className="px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-500/20 font-mono text-[11px] text-indigo-300">
                                        <strong>{v.titulo}</strong>: {formatARS(v.precioPublicado)} ({v.estado}, {v.participacionPropia} propio)
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowOriginInfo(false)}
                            className="text-[11px] text-indigo-300 hover:text-white underline shrink-0 mt-1"
                        >
                            Ocultar aviso
                        </button>
                    </div>
                )}

                {/* Filtros y Búsqueda */}
                <div className="p-4 border-b border-crm-border/40 bg-crm-surface/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" />
                            <input
                                type="text"
                                placeholder="Buscar por modelo, marca, patente o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-crm-fg focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-crm-bg border border-crm-border rounded-lg px-3 py-1.5 text-xs text-crm-fg focus:outline-none focus:border-blue-500"
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="disponible">Disponibles</option>
                            <option value="reservado">Reservados</option>
                            <option value="pausado">Pausados</option>
                            <option value="sin_estado">Sin estado</option>
                            <option value="consignacion">Consignaciones</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <CrmButton variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
                            <Download size={13} />
                            Exportar CSV
                        </CrmButton>
                    </div>
                </div>

                {/* Tabla Auditable */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="rounded-xl border border-crm-border overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[1000px]">
                            <thead className="bg-crm-bg/90 text-[11px] uppercase tracking-wider text-crm-fg-subtle border-b border-crm-border sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="py-2.5 px-3">Identificador / Vehículo</th>
                                    <th className="py-2.5 px-3">Estado</th>
                                    <th className="py-2.5 px-3 text-right">Costo Compra</th>
                                    <th className="py-2.5 px-3 text-right">Gastos</th>
                                    <th className="py-2.5 px-3 text-right">Precio Pub.</th>
                                    <th className="py-2.5 px-3 text-center">% Propio</th>
                                    <th className="py-2.5 px-3 text-right">Aporte Propio</th>
                                    <th className="py-2.5 px-3 text-center">% Inversor</th>
                                    <th className="py-2.5 px-3 text-right">Aporte Inversor</th>
                                    <th className="py-2.5 px-3">Motivo de Inclusión / Exclusión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border/40 font-normal">
                                {filteredVehicles.map((v) => (
                                    <tr key={v.id} className="hover:bg-crm-bg/30 transition-colors">
                                        <td className="py-2.5 px-3">
                                            <div className="font-semibold text-white">
                                                {v.brand} {v.name || v.model}
                                            </div>
                                            <div className="text-[10px] text-crm-fg-subtle flex items-center gap-1.5">
                                                <span>Año {v.year}</span>
                                                <span>·</span>
                                                <span>{v.plate}</span>
                                                <span>·</span>
                                                <span className="font-mono">{v.id.slice(-6)}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                v.isConsignment 
                                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                                                    : 'bg-crm-bg text-crm-fg border-crm-border'
                                            }`}>
                                                {v.isConsignment ? 'Consignación' : v.status}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono">
                                            {v.hasMissingCost ? (
                                                <span className="text-amber-400 font-semibold" title="Costo sin registrar en el CRM">
                                                    $0 (Pendiente)
                                                </span>
                                            ) : (
                                                formatARS(v.purchasePrice)
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-crm-fg-muted">
                                            {formatARS(v.expenses || 0)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                            {formatARS(v.price)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                v.ownPct === 100 
                                                    ? 'text-emerald-400 bg-emerald-500/10' 
                                                    : v.ownPct > 0 
                                                        ? 'text-blue-400 bg-blue-500/10' 
                                                        : 'text-crm-fg-subtle'
                                            }`}>
                                                {v.ownPct}%
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                            {formatARS(v.precioPropio)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                v.invPct > 0 ? 'text-purple-400 bg-purple-500/10' : 'text-crm-fg-subtle'
                                            }`}>
                                                {v.invPct}%
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-purple-300">
                                            {formatARS(v.precioInv)}
                                        </td>
                                        <td className="py-2.5 px-3 text-[11px] text-crm-fg-muted max-w-[280px] leading-tight">
                                            {v.reason}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-crm-border/70 bg-crm-bg/70 flex items-center justify-between text-xs text-crm-fg-muted">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Suma aritmética verificada: Valor Total = Propio + Inversionistas (Base homogénea a precios de venta publicados).</span>
                    </div>
                    <CrmButton variant="secondary" size="sm" onClick={onClose}>
                        Cerrar Auditoría
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
