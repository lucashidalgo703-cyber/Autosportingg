"use client";

import React, { useState } from 'react';
import {
    X,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    Edit3,
    Info,
    Calendar,
    User,
    FileText
} from 'lucide-react';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(amount || 0)));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
}

export default function TreasuryBoxDetailModal({
    isOpen,
    onClose,
    box,
    onEditBox,
    onTransferBox
}) {
    const [activeSection, setActiveSection] = useState('cobros'); // 'cobros' | 'gastos' | 'transferencias' | 'ajustes'

    if (!isOpen || !box) return null;

    const detail = box.detail || {};
    const contributingCollections = detail.contributingCollections || [];
    const paidExpenses = detail.paidExpenses || [];
    const pendingExpenses = detail.pendingExpenses || [];
    const transfers = detail.transfers || [];
    const manualAdjustments = detail.manualAdjustments || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
            <div className="my-8 w-full max-w-4xl rounded-3xl border border-purple-500/30 bg-crm-surface p-6 sm:p-7 shadow-2xl space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-crm-border">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                            Detalle y Trazabilidad de Caja Estratégica
                        </span>
                        <h2 className="text-lg font-black text-white mt-0.5">{box.name}</h2>
                        <p className="text-xs text-crm-fg-muted mt-0.5">{box.description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Indicadores Completos de la Caja */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                            Saldo Asignado
                        </span>
                        <p className="font-mono text-sm font-black text-white mt-1">
                            {formatMoney(box.balanceARS, 'ARS')}
                        </p>
                        <p className="font-mono text-xs font-bold text-emerald-400">
                            {formatMoney(box.balanceUSD, 'USD')}
                        </p>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                            Comprometido
                        </span>
                        <p className="font-mono text-sm font-black text-red-400 mt-1">
                            {formatMoney(box.commitmentsARS, 'ARS')}
                        </p>
                        <p className="font-mono text-xs font-bold text-red-300">
                            {formatMoney(box.commitmentsUSD, 'USD')}
                        </p>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                            Disponible Libre
                        </span>
                        <p className="font-mono text-sm font-black text-emerald-400 mt-1">
                            {formatMoney(box.availableARS, 'ARS')}
                        </p>
                        <p className="font-mono text-xs font-bold text-emerald-300">
                            {formatMoney(box.availableUSD, 'USD')}
                        </p>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                            Objetivo
                        </span>
                        <p className="font-mono text-sm font-black text-purple-300 mt-1">
                            {formatMoney(box.targetMoneyARS, 'ARS')}
                        </p>
                        <p className="font-mono text-xs font-bold text-purple-200">
                            {formatMoney(box.targetMoneyUSD, 'USD')}
                        </p>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                            Faltante
                        </span>
                        <p className="font-mono text-sm font-black text-amber-300 mt-1">
                            {formatMoney(box.shortfallARS, 'ARS')}
                        </p>
                        <p className="font-mono text-xs font-bold text-amber-200">
                            {formatMoney(box.shortfallUSD, 'USD')}
                        </p>
                    </div>
                </div>

                {/* Explicación del cálculo */}
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-xs">
                    <div className="flex items-start gap-2">
                        <Info size={15} className="text-purple-300 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <span className="font-black text-purple-200 uppercase text-[10px] tracking-wider block">
                                Explicación del Cálculo de Objetivo y Disponibilidad
                            </span>
                            <p className="text-crm-fg leading-relaxed">
                                {box.calculationExplanation || 'Objetivo basado en compromisos pendientes y presupuesto configurado sin duplicación en el período.'}
                            </p>
                            {box.missingDataNote && (
                                <p className="text-amber-300 text-[11px] font-medium">
                                    ℹ️ {box.missingDataNote}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pestañas de detalle */}
                <div className="flex flex-wrap items-center gap-2 border-b border-crm-border pb-2 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveSection('cobros')}
                        className={`rounded-xl px-3.5 py-1.5 transition-colors flex items-center gap-1.5 ${activeSection === 'cobros' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-bg hover:text-white'}`}
                    >
                        <ArrowDownRight size={13} /> Cobros que aportaron fondos ({contributingCollections.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('gastos')}
                        className={`rounded-xl px-3.5 py-1.5 transition-colors flex items-center gap-1.5 ${activeSection === 'gastos' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-bg hover:text-white'}`}
                    >
                        <ArrowUpRight size={13} /> Gastos pagados y pendientes ({paidExpenses.length + pendingExpenses.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('transferencias')}
                        className={`rounded-xl px-3.5 py-1.5 transition-colors flex items-center gap-1.5 ${activeSection === 'transferencias' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-bg hover:text-white'}`}
                    >
                        <ArrowRightLeft size={13} /> Transferencias entre cajas ({transfers.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('ajustes')}
                        className={`rounded-xl px-3.5 py-1.5 transition-colors flex items-center gap-1.5 ${activeSection === 'ajustes' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-bg hover:text-white'}`}
                    >
                        <Edit3 size={13} /> Ajustes manuales ({manualAdjustments.length})
                    </button>
                </div>

                {/* Contenido de cada pestaña de detalle */}
                <div className="max-h-[340px] overflow-y-auto rounded-2xl border border-crm-border bg-crm-bg divide-y divide-crm-border text-xs">
                    {activeSection === 'cobros' && (
                        contributingCollections.length === 0 ? (
                            <p className="p-6 text-center text-crm-fg-muted italic">
                                No hay cobros registrados que hayan aportado fondos a esta caja todavía.
                            </p>
                        ) : (
                            contributingCollections.map((item, idx) => (
                                <div key={item.id || item._id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-crm-surface transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{item.reason || 'Aporte por cobro'}</span>
                                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                                {item.type}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-crm-fg-muted flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1"><Calendar size={11} /> {item.date ? new Date(item.date).toLocaleString('es-AR') : '-'}</span>
                                            <span className="inline-flex items-center gap-1"><User size={11} /> Usuario: {item.user || 'Sistema'}</span>
                                        </p>
                                    </div>
                                    <div className={`text-right font-mono font-bold shrink-0 ${(item.amount ?? item.amountARS ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.amount !== undefined
                                            ? `${item.amount >= 0 ? '+' : ''}${formatMoney(item.amount, item.currency || 'ARS')}`
                                            : `${item.amountARS ? `+${formatMoney(item.amountARS, 'ARS')}` : ''} ${item.amountUSD ? `+${formatMoney(item.amountUSD, 'USD')}` : ''}`}
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {activeSection === 'gastos' && (
                        (paidExpenses.length === 0 && pendingExpenses.length === 0) ? (
                            <p className="p-6 text-center text-crm-fg-muted italic">
                                No hay gastos pagados ni pendientes vinculados a esta caja.
                            </p>
                        ) : (
                            <>
                                {pendingExpenses.map((exp, idx) => (
                                    <div key={`pend-${exp.id || idx}`} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-500/5 hover:bg-crm-surface transition-colors">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-amber-200">{exp.description}</span>
                                                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                                                    Pendiente / Comprometido
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-crm-fg-muted flex items-center gap-3">
                                                <span>Categoría: {exp.category}</span>
                                                <span>Fecha: {exp.date ? new Date(exp.date).toLocaleDateString('es-AR') : '-'}</span>
                                                <span>Usuario: {exp.user || 'Sistema'}</span>
                                                {exp.reason && <span>Motivo: {exp.reason}</span>}
                                            </p>
                                        </div>
                                        <div className="text-right font-mono font-bold text-amber-300 shrink-0">
                                            -{formatMoney(exp.amount, exp.currency)}
                                        </div>
                                    </div>
                                ))}
                                {paidExpenses.map((item, idx) => (
                                    <div key={`paid-${item.id || item._id || idx}`} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-crm-surface transition-colors">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{item.description || item.reason || 'Gasto pagado'}</span>
                                                <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 uppercase">
                                                    Pagado
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-crm-fg-muted flex items-center gap-3">
                                                <span>Fecha: {item.date ? new Date(item.date).toLocaleString('es-AR') : '-'}</span>
                                                <span>Usuario: {item.user || 'Sistema'}</span>
                                                {item.reason && <span>Motivo: {item.reason}</span>}
                                            </p>
                                        </div>
                                        <div className="text-right font-mono font-bold text-red-400 shrink-0">
                                            {item.amount !== undefined
                                                ? `-${formatMoney(Math.abs(item.amount), item.currency || 'ARS')}`
                                                : `${item.amountARS ? formatMoney(item.amountARS, 'ARS') : ''} ${item.amountUSD ? formatMoney(item.amountUSD, 'USD') : ''}`}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )
                    )}

                    {activeSection === 'transferencias' && (
                        transfers.length === 0 ? (
                            <p className="p-6 text-center text-crm-fg-muted italic">
                                No se registraron transferencias internas en esta caja.
                            </p>
                        ) : (
                            transfers.map((item, idx) => (
                                <div key={item.id || item._id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-crm-surface transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{item.reason}</span>
                                            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                                {(item.amount ?? 0) >= 0 ? 'Entrada' : 'Salida'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-crm-fg-muted flex items-center gap-3">
                                            <span>Fecha: {item.date ? new Date(item.date).toLocaleString('es-AR') : '-'}</span>
                                            <span>Usuario: {item.user || 'Sistema'}</span>
                                            {(item.fromBox || item.toBox) && <span>{item.fromBox || ''} → {item.toBox || ''}</span>}
                                        </p>
                                    </div>
                                    <div className={`text-right font-mono font-bold shrink-0 ${(item.amount ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.amount !== undefined
                                            ? `${item.amount >= 0 ? '+' : ''}${formatMoney(item.amount, item.currency || 'ARS')}`
                                            : `${item.amountARS ? formatMoney(item.amountARS, 'ARS') : ''} ${item.amountUSD ? formatMoney(item.amountUSD, 'USD') : ''}`}
                                    </div>
                                </div>
                            ))
                        )
                    )}

                    {activeSection === 'ajustes' && (
                        manualAdjustments.length === 0 ? (
                            <p className="p-6 text-center text-crm-fg-muted italic">
                                No hay ajustes manuales registrados en esta caja.
                            </p>
                        ) : (
                            manualAdjustments.map((item, idx) => (
                                <div key={item.id || item._id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-crm-surface transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{item.reason || 'Ajuste manual'}</span>
                                            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 uppercase">
                                                {item.type}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-crm-fg-muted flex items-center gap-3">
                                            <span>Fecha: {item.date ? new Date(item.date).toLocaleString('es-AR') : '-'}</span>
                                            <span>Usuario: {item.user || 'Sistema'}</span>
                                        </p>
                                    </div>
                                    <div className="text-right font-mono font-bold text-emerald-400 shrink-0">
                                        {item.amount !== undefined
                                            ? formatMoney(item.amount, item.currency || 'ARS')
                                            : `${item.amountARS ? formatMoney(item.amountARS, 'ARS') : ''} ${item.amountUSD ? formatMoney(item.amountUSD, 'USD') : ''}`}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>

                {/* Acciones inferiores */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-crm-border">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (onEditBox) onEditBox(box);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/15 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/25 transition-colors"
                        >
                            <Edit3 size={13} /> Editar Asignación (con vista previa)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (onTransferBox) onTransferBox(box);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-bg px-3.5 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        >
                            <ArrowRightLeft size={13} /> Transferir entre Cajas (con vista previa)
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-crm-border bg-crm-surface-raised px-4 py-2 text-xs font-bold text-crm-fg-muted hover:text-white"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
