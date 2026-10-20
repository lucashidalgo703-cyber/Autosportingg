"use client";

import React, { useState, useEffect } from 'react';
import { X, History, Calendar, CheckCircle2, AlertTriangle, ArrowRight, Clock, FileText } from 'lucide-react';

export default function InstallmentHistoryModal({
    isOpen,
    onClose,
    installmentId
}) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (isOpen && installmentId) {
            setLoading(true);
            const token = localStorage.getItem('token');
            fetch(`/api/admin/installments/${installmentId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(res => {
                    if (res.ok) setData(res);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            setData(null);
        }
    }, [isOpen, installmentId]);

    if (!isOpen) return null;

    const inst = data?.installment;
    const historyList = data?.rescheduleHistory || [];
    const auditLogs = data?.installmentAuditLog || [];
    const txs = data?.transactions || [];

    const curr = inst?.currency === 'USD' ? 'USD' : '$';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-crm-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <History size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Historial de Cuota</h3>
                            <p className="text-xs text-neutral-400">
                                {inst ? `Cuota #${inst.installmentNumber} — ${curr} ${Number(inst.amount || 0).toLocaleString('es-AR')}` : 'Cargando historial...'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-3">
                            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            <span className="text-xs">Cargando historial...</span>
                        </div>
                    ) : (
                        <>
                            {/* Cronograma Original */}
                            <div className="bg-black/40 border border-neutral-800/80 rounded-xl p-4">
                                <h4 className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 mb-2">
                                    Cronograma y Datos Iniciales
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-neutral-500 block text-[10px]">Vencimiento Original</span>
                                        <span className="text-white font-mono font-bold">
                                            {inst?.originalDueDate ? new Date(inst.originalDueDate).toLocaleDateString('es-AR') : (inst?.dueDate ? new Date(inst.dueDate).toLocaleDateString('es-AR') : '-')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[10px]">Importe Original</span>
                                        <span className="text-white font-mono font-bold">
                                            {curr} {Number(inst?.amount || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[10px]">Total Cobrado</span>
                                        <span className="text-emerald-400 font-mono font-bold">
                                            {curr} {Number(inst?.paidAmount || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500 block text-[10px]">Saldo Pendiente</span>
                                        <span className="text-amber-400 font-mono font-bold">
                                            {curr} {Math.max(0, Number(inst?.amount || 0) - Number(inst?.paidAmount || 0)).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Reprogramaciones */}
                            <div>
                                <h4 className="text-xs uppercase tracking-wider font-bold text-neutral-300 mb-3 flex items-center gap-2">
                                    <Clock size={14} className="text-amber-400" />
                                    Historial de Reprogramaciones ({historyList.length})
                                </h4>
                                {historyList.length === 0 ? (
                                    <div className="text-xs text-neutral-500 italic p-3 bg-black/20 border border-neutral-800/40 rounded-xl">
                                        No se han registrado reprogramaciones para esta cuota.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {historyList.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3.5 rounded-xl border text-xs ${
                                                    item.isCancelled
                                                        ? 'bg-red-500/5 border-red-500/20 opacity-75'
                                                        : 'bg-amber-500/5 border-amber-500/20'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2 font-mono">
                                                        <span className="text-neutral-400">
                                                            {new Date(item.previousDate).toLocaleDateString('es-AR')}
                                                        </span>
                                                        <ArrowRight size={12} className="text-neutral-500" />
                                                        <span className="text-amber-400 font-bold">
                                                            {new Date(item.newDate).toLocaleDateString('es-AR')}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-neutral-500">
                                                        {new Date(item.date).toLocaleDateString('es-AR')} por {item.user}
                                                    </span>
                                                </div>
                                                <p className="text-neutral-200">
                                                    <strong>Motivo:</strong> {item.reason}
                                                </p>
                                                {item.notes && (
                                                    <p className="text-neutral-400 text-[11px] mt-0.5">
                                                        <strong>Notas:</strong> {item.notes}
                                                    </p>
                                                )}
                                                {item.isCancelled && (
                                                    <div className="mt-2 pt-2 border-t border-red-500/20 text-red-400 text-[11px]">
                                                        <strong>Reprogramación cancelada:</strong> {item.cancelReason || 'Sin motivo especificado'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cobros registrados */}
                            <div>
                                <h4 className="text-xs uppercase tracking-wider font-bold text-neutral-300 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    Cobros y Movimientos de Caja ({txs.length})
                                </h4>
                                {txs.length === 0 ? (
                                    <div className="text-xs text-neutral-500 italic p-3 bg-black/20 border border-neutral-800/40 rounded-xl">
                                        No se han registrado cobros para esta cuota aún.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {txs.map((tx, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs flex justify-between items-center"
                                            >
                                                <div>
                                                    <span className="font-bold text-white block">
                                                        {tx.concept || 'Cobro de cuota'}
                                                    </span>
                                                    <span className="text-[11px] text-neutral-400">
                                                        {new Date(tx.date || tx.createdAt).toLocaleDateString('es-AR')} — {tx.paymentMethod || 'Efectivo'}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-mono font-bold text-emerald-400">
                                                    +{tx.currency === 'USD' ? 'USD' : '$'} {Number(tx.amount || 0).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Auditoría del sistema */}
                            {auditLogs.length > 0 && (
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-2">
                                        Bitácora del Sistema
                                    </h4>
                                    <div className="space-y-1.5 text-[11px] text-neutral-400 bg-black/20 border border-neutral-800/40 rounded-xl p-3 max-h-40 overflow-y-auto">
                                        {auditLogs.map((log, idx) => (
                                            <div key={idx} className="flex justify-between items-start py-1 border-b border-neutral-800/30 last:border-0">
                                                <span>{log.description || log.action}</span>
                                                <span className="text-neutral-500 font-mono text-[10px] shrink-0 ml-2">
                                                    {new Date(log.date).toLocaleDateString('es-AR')} ({log.user})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 bg-crm-surface flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
