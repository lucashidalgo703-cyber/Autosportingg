"use client";

import React, { useState } from 'react';
import {
    Activity,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Info,
    RefreshCw,
    X,
    ShieldCheck,
    Wallet,
    DollarSign,
    Car,
    FileText,
    Copy,
    Check
} from 'lucide-react';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(Math.round(val || 0));
}

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = formatNumber(Math.abs(amount || 0));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
}

export default function TreasuryDiagnosticModal({
    isOpen,
    onClose,
    diagnosticData,
    loading,
    onRefresh
}) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('equation'); // 'equation' | 'findings' | 'accounts' | 'boxes'

    if (!isOpen) return null;

    const handleCopyReport = () => {
        if (!diagnosticData) return;
        const text = JSON.stringify(diagnosticData, null, 2);
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const eq = diagnosticData?.reconciliationEquation;
    const findings = diagnosticData?.findings || [];
    const accounts = diagnosticData?.liquidityDetails?.accounts?.list || [];
    const boxes = diagnosticData?.liquidityDetails?.boxes?.list || [];

    const isSystemBalanced = diagnosticData?.isSystemBalanced;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-800 bg-[#0B0F19] text-slate-100 shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                            <Activity size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white">
                                    Diagnóstico Integral y Conciliación
                                </h3>
                                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                    Solo Lectura
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Auditoría de cuentas reales, cajas estratégicas, pagos de compras y ecuación de liquidez.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            title="Recalcular diagnóstico"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin text-cyan-400' : ''} />
                            <span>Actualizar</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-800 bg-slate-800/50 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Subheader / Tabs */}
                <div className="border-b border-slate-800 bg-slate-900/30 px-5 flex items-center justify-between text-xs overflow-x-auto">
                    <div className="flex space-x-1 py-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('equation')}
                            className={`rounded-xl px-3 py-1.5 font-bold transition-colors ${
                                activeTab === 'equation'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Ecuación Central
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('findings')}
                            className={`rounded-xl px-3 py-1.5 font-bold transition-colors flex items-center gap-1.5 ${
                                activeTab === 'findings'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <span>Hallazgos</span>
                            {findings.length > 0 && (
                                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                                    findings.some(f => f.level === 'critical') ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                                }`}>
                                    {findings.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('accounts')}
                            className={`rounded-xl px-3 py-1.5 font-bold transition-colors ${
                                activeTab === 'accounts'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Cuentas Físicas ({accounts.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('boxes')}
                            className={`rounded-xl px-3 py-1.5 font-bold transition-colors ${
                                activeTab === 'boxes'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Cajas Estratégicas ({boxes.length})
                        </button>
                    </div>

                    {diagnosticData && (
                        <div className="flex items-center gap-2 py-2">
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                                {new Date(diagnosticData.timestamp).toLocaleTimeString('es-AR')}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyReport}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                    {loading && (
                        <div className="py-16 text-center text-xs text-cyan-400 flex flex-col items-center justify-center gap-3">
                            <RefreshCw size={24} className="animate-spin text-cyan-400" />
                            <p className="font-semibold text-slate-300">
                                Ejecutando escaneo de solo lectura sobre movimientos, cuentas y cajas...
                            </p>
                        </div>
                    )}

                    {!loading && diagnosticData && (
                        <>
                            {/* Status Banner */}
                            <div className={`rounded-2xl border p-4 ${
                                isSystemBalanced
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {isSystemBalanced ? (
                                            <ShieldCheck size={20} className="text-emerald-400" />
                                        ) : (
                                            <AlertTriangle size={20} className="text-amber-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black uppercase tracking-wider">
                                            {isSystemBalanced
                                                ? 'Ecuación de Conciliación en Equilibrio Exacto'
                                                : 'Atención: Existen diferencias o hallazgos pendientes de revisión'}
                                        </h4>
                                        <p className="text-xs text-slate-300 mt-1">
                                            {isSystemBalanced
                                                ? 'Para ARS y USD, la suma de cuentas físicas es idéntica a la suma de cajas estratégicas más dinero sin asignar (diferencia = $0).'
                                                : 'Se encontraron inconsistencias entre saldos de cuentas y asignaciones o movimientos que requieren verificación.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* TAB: ECUACIÓN CENTRAL */}
                            {activeTab === 'equation' && eq && (
                                <div className="space-y-4">
                                    <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                        <strong className="text-slate-200">Regla Central:</strong> Las cuentas físicas indican <em>dónde</em> está el dinero y las cajas estratégicas indican <em>para qué</em> está reservado. La ecuación debe cumplirse siempre de forma independiente por cada moneda.
                                    </div>

                                    {/* ARS Equation */}
                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                                                <DollarSign size={14} /> Conciliación ARS
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                eq.ARS?.isBalanced
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                                            }`}>
                                                {eq.ARS?.isBalanced ? 'Equilibrado (Diff = 0)' : `Diferencia: ${formatMoney(eq.ARS?.difference, 'ARS')}`}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Liquidez Real (Cuentas)</span>
                                                <strong className="font-mono text-base font-black text-white block mt-1">
                                                    {formatMoney(eq.ARS?.totalCuentas, 'ARS')}
                                                </strong>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Asignado a Cajas</span>
                                                <strong className="font-mono text-base font-black text-purple-300 block mt-1">
                                                    {formatMoney(eq.ARS?.totalCajas, 'ARS')}
                                                </strong>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Dinero Sin Asignar</span>
                                                <strong className="font-mono text-base font-black text-emerald-300 block mt-1">
                                                    {formatMoney(eq.ARS?.unallocated, 'ARS')}
                                                </strong>
                                            </div>
                                            <div className={`p-3 rounded-xl border ${
                                                eq.ARS?.isBalanced
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                                            }`}>
                                                <span className="text-[10px] block uppercase font-bold">Diferencia</span>
                                                <strong className="font-mono text-base font-black block mt-1">
                                                    {formatMoney(eq.ARS?.difference, 'ARS')}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* USD Equation */}
                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                                <DollarSign size={14} /> Conciliación USD
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                eq.USD?.isBalanced
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                                            }`}>
                                                {eq.USD?.isBalanced ? 'Equilibrado (Diff = 0)' : `Diferencia: ${formatMoney(eq.USD?.difference, 'USD')}`}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Liquidez Real (Cuentas)</span>
                                                <strong className="font-mono text-base font-black text-white block mt-1">
                                                    {formatMoney(eq.USD?.totalCuentas, 'USD')}
                                                </strong>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Asignado a Cajas</span>
                                                <strong className="font-mono text-base font-black text-purple-300 block mt-1">
                                                    {formatMoney(eq.USD?.totalCajas, 'USD')}
                                                </strong>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Dinero Sin Asignar</span>
                                                <strong className="font-mono text-base font-black text-emerald-300 block mt-1">
                                                    {formatMoney(eq.USD?.unallocated, 'USD')}
                                                </strong>
                                            </div>
                                            <div className={`p-3 rounded-xl border ${
                                                eq.USD?.isBalanced
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                                            }`}>
                                                <span className="text-[10px] block uppercase font-bold">Diferencia</span>
                                                <strong className="font-mono text-base font-black block mt-1">
                                                    {formatMoney(eq.USD?.difference, 'USD')}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: HALLAZGOS */}
                            {activeTab === 'findings' && (
                                <div className="space-y-3">
                                    {findings.length === 0 ? (
                                        <div className="text-center py-10 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-2">
                                            <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                                            <h4 className="text-sm font-bold text-white">Sin irregularidades detectadas</h4>
                                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                                Todos los saldos de cuentas, cajas estratégicas y pagos de compras cumplen con las validaciones de consistencia.
                                            </p>
                                        </div>
                                    ) : (
                                        findings.map((f, i) => (
                                            <div
                                                key={i}
                                                className={`rounded-2xl border p-4 space-y-1.5 ${
                                                    f.level === 'critical'
                                                        ? 'border-red-500/40 bg-red-500/10'
                                                        : f.level === 'warning'
                                                        ? 'border-amber-500/40 bg-amber-500/10'
                                                        : 'border-blue-500/40 bg-blue-500/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                        f.level === 'critical'
                                                            ? 'bg-red-500/30 text-red-300'
                                                            : f.level === 'warning'
                                                            ? 'bg-amber-500/30 text-amber-300'
                                                            : 'bg-blue-500/30 text-blue-300'
                                                    }`}>
                                                        {f.level === 'critical' ? 'Crítico' : f.level === 'warning' ? 'Advertencia' : 'Información'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                                                        {f.category}
                                                    </span>
                                                </div>
                                                <h5 className="text-xs font-bold text-white">{f.title}</h5>
                                                <p className="text-xs text-slate-300 leading-relaxed">{f.detail}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* TAB: CUENTAS */}
                            {activeTab === 'accounts' && (
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                                    <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs font-bold text-slate-300">
                                        <span>Cuenta Físico / Bancaria</span>
                                        <span>Tipo & Saldo Actual</span>
                                    </div>
                                    <div className="divide-y divide-slate-800/60 text-xs">
                                        {accounts.map(acc => (
                                            <div key={acc._id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                                <div>
                                                    <span className="font-bold text-white block">{acc.name}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {acc.type} • {acc.currency}
                                                    </span>
                                                </div>
                                                <span className={`font-mono font-bold text-sm ${acc.balance < 0 ? 'text-red-400' : 'text-slate-100'}`}>
                                                    {formatMoney(acc.balance, acc.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: CAJAS ESTRATÉGICAS */}
                            {activeTab === 'boxes' && (
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                                    <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs font-bold text-slate-300">
                                        <span>Caja Estratégica</span>
                                        <span>Saldos Reservados (ARS / USD)</span>
                                    </div>
                                    <div className="divide-y divide-slate-800/60 text-xs">
                                        {boxes.map(b => (
                                            <div key={b._id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                                <div>
                                                    <span className="font-bold text-white block">{b.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Clave: {b.key}
                                                    </span>
                                                </div>
                                                <div className="text-right font-mono">
                                                    <div className="text-purple-300 font-bold">{formatMoney(b.balanceARS, 'ARS')}</div>
                                                    <div className="text-emerald-300 font-bold">{formatMoney(b.balanceUSD, 'USD')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/70 shrink-0 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Info size={13} className="text-cyan-400" />
                        <span>Diagnóstico seguro: no altera saldos ni genera movimientos automáticos.</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 font-bold text-white transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
