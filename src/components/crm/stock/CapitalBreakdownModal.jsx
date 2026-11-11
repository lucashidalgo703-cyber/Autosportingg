"use client";
import React, { useState } from 'react';
import { X, Search, AlertCircle, CheckCircle2, Calendar, FileText, ArrowUpRight, DollarSign, ExternalLink } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

function formatARS(val) {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    return '$' + Math.round(val).toLocaleString('es-AR');
}

export default function CapitalBreakdownModal({ isOpen, onClose, componentKey, componentData, totals }) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen || !componentData) return null;

    const items = componentData.items || [];
    const filteredItems = items.filter(item => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const str = JSON.stringify(item).toLowerCase();
        return str.includes(q);
    });

    const isStock = componentKey === 'stockPropioCosto';
    const isEfectivo = componentKey === 'efectivoPropio';
    const isCartera = componentKey === 'carteraPropia';
    const isOtrosCreditos = componentKey === 'otrosCreditos';
    const isDeudas = componentKey === 'deudasPropia';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-crm-border/70 flex items-start justify-between bg-crm-bg/60">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-black ${
                                componentData.signo === '−' 
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                                {componentData.signo}
                            </span>
                            <h2 className="text-lg font-bold text-white tracking-tight">
                                {componentData.label}
                            </h2>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                                {formatARS(componentData.monto)}
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted max-w-2xl leading-relaxed">
                            {componentData.descripcion}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-subtle hover:text-white hover:bg-crm-surface transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search & Metadata Bar */}
                <div className="p-4 border-b border-crm-border/40 bg-crm-surface/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" />
                        <input
                            type="text"
                            placeholder="Buscar registros, códigos, modelos o fechas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-crm-fg focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-crm-fg-muted">
                        <span>Total registros: <strong>{items.length}</strong></span>
                        {filteredItems.length !== items.length && (
                            <span className="text-blue-400">({filteredItems.length} filtrados)</span>
                        )}
                        {componentData.unidadesSinCosto > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                ⚠️ {componentData.unidadesSinCosto} pendientes de costo
                            </span>
                        )}
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-crm-fg-subtle text-xs">
                            No se encontraron registros para este componente con el filtro actual.
                        </div>
                    ) : (
                        <div className="rounded-xl border border-crm-border overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-crm-bg/80 text-[11px] uppercase tracking-wider text-crm-fg-subtle border-b border-crm-border">
                                    <tr>
                                        {isStock && (
                                            <>
                                                <th className="py-2.5 px-3">Vehículo / Identificador</th>
                                                <th className="py-2.5 px-3">Estado</th>
                                                <th className="py-2.5 px-3 text-right">Costo Compra</th>
                                                <th className="py-2.5 px-3 text-right">Gastos</th>
                                                <th className="py-2.5 px-3 text-right">Costo Total</th>
                                                <th className="py-2.5 px-3 text-center">% Propio</th>
                                                <th className="py-2.5 px-3 text-right">Aporte a Mi Capital</th>
                                                <th className="py-2.5 px-3 text-right">Precio Pub.</th>
                                            </>
                                        )}
                                        {isEfectivo && (
                                            <>
                                                <th className="py-2.5 px-3">Cuenta / Caja</th>
                                                <th className="py-2.5 px-3">Tipo</th>
                                                <th className="py-2.5 px-3">Moneda</th>
                                                <th className="py-2.5 px-3 text-right">Saldo Conciliado</th>
                                                <th className="py-2.5 px-3">Trazabilidad</th>
                                            </>
                                        )}
                                        {isCartera && (
                                            <>
                                                <th className="py-2.5 px-3">Cuota / Vencimiento</th>
                                                <th className="py-2.5 px-3">Operación / Vehículo</th>
                                                <th className="py-2.5 px-3">Estado</th>
                                                <th className="py-2.5 px-3 text-right">Importe Total</th>
                                                <th className="py-2.5 px-3 text-center">% Propio</th>
                                                <th className="py-2.5 px-3 text-right">Aporte a Mi Capital</th>
                                                <th className="py-2.5 px-3">Detalle / Plan</th>
                                            </>
                                        )}
                                        {isOtrosCreditos && (
                                            <>
                                                <th className="py-2.5 px-3">Concepto</th>
                                                <th className="py-2.5 px-3">Beneficiario / Socio</th>
                                                <th className="py-2.5 px-3 text-right">Importe</th>
                                                <th className="py-2.5 px-3">Fecha</th>
                                            </>
                                        )}
                                        {isDeudas && (
                                            <>
                                                <th className="py-2.5 px-3">Concepto / Obligación</th>
                                                <th className="py-2.5 px-3">Categoría</th>
                                                <th className="py-2.5 px-3">Vencimiento</th>
                                                <th className="py-2.5 px-3 text-right">Importe a Deducir</th>
                                                <th className="py-2.5 px-3">Estado</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-crm-border/50">
                                    {filteredItems.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-crm-bg/40 transition-colors">
                                            {isStock && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        <div className="font-semibold text-white">
                                                            {item.brand} {item.name || item.model}
                                                        </div>
                                                        <div className="text-[10px] text-crm-fg-subtle flex items-center gap-1.5">
                                                            <span>Año {item.year}</span>
                                                            <span>·</span>
                                                            <span>Patente: {item.plate}</span>
                                                            <span>·</span>
                                                            <span className="font-mono">{item.id.slice(-6)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-crm-bg border border-crm-border text-crm-fg">
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono">
                                                        {item.hasMissingCost ? (
                                                            <span className="text-amber-400 font-semibold" title="Pendiente de registrar costo real">
                                                                $0 (Pendiente)
                                                            </span>
                                                        ) : (
                                                            formatARS(item.purchasePrice)
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono text-crm-fg-muted">
                                                        {formatARS(item.expenses || 0)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono font-medium text-crm-fg">
                                                        {formatARS(item.costoBase)}
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                            item.ownPct === 100 
                                                                ? 'text-emerald-400 bg-emerald-500/10' 
                                                                : 'text-purple-400 bg-purple-500/10'
                                                        }`}>
                                                            {item.ownPct}%
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                                                        {formatARS(item.costoPropio)}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono text-crm-fg-muted">
                                                        {formatARS(item.price)}
                                                    </td>
                                                </>
                                            )}

                                            {isEfectivo && (
                                                <>
                                                    <td className="py-2 px-3 font-semibold text-white">
                                                        {item.name}
                                                    </td>
                                                    <td className="py-2 px-3 text-crm-fg-muted">
                                                        {item.type}
                                                    </td>
                                                    <td className="py-2 px-3 font-mono font-bold text-blue-300">
                                                        {item.currency}
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                                                        {formatARS(item.balance)}
                                                    </td>
                                                    <td className="py-2 px-3 text-[11px] text-crm-fg-subtle">
                                                        {item.notes}
                                                    </td>
                                                </>
                                            )}

                                            {isCartera && (
                                                <>
                                                    <td className="py-2 px-3">
                                                        <div className="font-semibold text-white">
                                                            Cuota #{item.installmentNumber}
                                                        </div>
                                                        <div className="text-[10px] text-crm-fg-subtle">
                                                            Vence: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-AR') : 'S/F'}
                                                            {item.isOverdue && <span className="ml-1 text-rose-400 font-bold">Vencida</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="font-medium text-crm-fg">
                                                            {item.vehicleTitle}
                                                        </div>
                                                        {item.saleId && (
                                                            <div className="text-[10px] text-crm-fg-subtle font-mono">
                                                                Venta: {item.saleId.slice(-6)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-crm-bg border border-crm-border text-crm-fg">
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono text-crm-fg">
                                                        {formatARS(item.remaining)}
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-500/10">
                                                            {item.ownPct}%
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                                                        {formatARS(item.ownRemaining)}
                                                    </td>
                                                    <td className="py-2 px-3 text-[10px] text-crm-fg-muted max-w-[200px] truncate" title={item.notes}>
                                                        {item.notes || 'Pactada en venta'}
                                                    </td>
                                                </>
                                            )}

                                            {isOtrosCreditos && (
                                                <>
                                                    <td className="py-2 px-3 font-medium text-white">{item.concept}</td>
                                                    <td className="py-2 px-3 text-crm-fg-muted">{item.beneficiary}</td>
                                                    <td className="py-2 px-3 text-right font-mono text-emerald-400">{formatARS(item.amount)}</td>
                                                    <td className="py-2 px-3 text-crm-fg-subtle">{item.date}</td>
                                                </>
                                            )}

                                            {isDeudas && (
                                                <>
                                                    <td className="py-2 px-3 font-semibold text-white">{item.concept}</td>
                                                    <td className="py-2 px-3 text-crm-fg-muted">{item.category}</td>
                                                    <td className="py-2 px-3 text-crm-fg-subtle">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-AR') : 'S/F'}</td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-400">− {formatARS(item.amount)}</td>
                                                    <td className="py-2 px-3">{item.status}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-crm-border/70 bg-crm-bg/60 flex items-center justify-between text-xs text-crm-fg-muted">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Valores conciliados con la base de datos de AutoSporting sin duplicaciones contables.</span>
                    </div>
                    <CrmButton variant="secondary" size="sm" onClick={onClose}>
                        Cerrar
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
