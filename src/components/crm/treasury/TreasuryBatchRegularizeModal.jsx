"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    FileCheck,
    AlertCircle,
    CheckCircle2,
    X,
    Calendar,
    RotateCcw,
    Layers,
    User,
    Car,
    ChevronDown,
    ChevronRight,
    Search,
    ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasuryBatchRegularizeModal({
    isOpen,
    onClose,
    treasuryToken,
    batchLogs = [],
    onSuccess
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [viewMode, setViewMode] = useState('regularizar'); // 'regularizar' | 'lotes_anteriores'
    const [loadingGrouped, setLoadingGrouped] = useState(false);
    const [salesGroups, setSalesGroups] = useState([]);
    const [expandedSales, setExpandedSales] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    // Selecciones: map de installmentId -> objeto installment
    const [selectedInstallments, setSelectedInstallments] = useState({});
    // Input para "pagadas hasta la cuota N" por saleId: { [saleId]: number }
    const [upToNInputs, setUpToNInputs] = useState({});

    // Parámetros de auditoría
    const [cutoffDate, setCutoffDate] = useState(todayStr);
    const [reason, setReason] = useState('Regularización histórica de cuotas cobradas antes del corte (incluidas en saldo inicial)');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reversión de lote
    const [revertingBatchId, setRevertingBatchId] = useState(null);
    const [revertReason, setRevertReason] = useState('');
    const [isReverting, setIsReverting] = useState(false);

    // Cargar cuotas agrupadas al abrir
    const fetchGroupedInstallments = useCallback(async () => {
        if (!treasuryToken) return;
        try {
            setLoadingGrouped(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/installments/grouped', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                }
            });
            const data = await res.json();
            if (data.ok) {
                setSalesGroups(data.groups || []);
                // Expandir la primera venta por comodidad
                if (data.groups && data.groups.length > 0) {
                    setExpandedSales({ [data.groups[0].saleId]: true });
                }
            } else {
                toast.error(data.message || 'Error al cargar cuotas');
            }
        } catch {
            toast.error('Error al consultar cuotas agrupadas');
        } finally {
            setLoadingGrouped(false);
        }
    }, [treasuryToken]);

    useEffect(() => {
        if (isOpen) {
            fetchGroupedInstallments();
        }
    }, [isOpen, fetchGroupedInstallments]);

    if (!isOpen) return null;

    // Toggle expandir tarjeta de venta
    const toggleExpand = (saleId) => {
        setExpandedSales(prev => ({ ...prev, [saleId]: !prev[saleId] }));
    };

    // Toggle individual de cuota
    const handleToggleInstallment = (inst) => {
        setSelectedInstallments(prev => {
            const next = { ...prev };
            if (next[inst._id]) {
                delete next[inst._id];
            } else {
                next[inst._id] = inst;
            }
            return next;
        });
    };

    // Seleccionar todas las cuotas de una venta
    const handleSelectAllInSale = (group) => {
        const allSelected = group.installments.every(i => selectedInstallments[i._id]);
        setSelectedInstallments(prev => {
            const next = { ...prev };
            group.installments.forEach(i => {
                if (allSelected) {
                    delete next[i._id];
                } else {
                    next[i._id] = i;
                }
            });
            return next;
        });
    };

    // "Pagadas hasta la cuota N" para una venta específica
    const handleApplyUpToN = (group) => {
        const n = parseInt(upToNInputs[group.saleId], 10);
        if (isNaN(n) || n < 1) {
            toast.error('Ingresá un número de cuota válido');
            return;
        }

        setSelectedInstallments(prev => {
            const next = { ...prev };
            group.installments.forEach(inst => {
                const instNum = inst.installmentNumber;
                if (instNum <= n) {
                    next[inst._id] = inst;
                } else {
                    delete next[inst._id];
                }
            });
            return next;
        });
        toast.success(`Marcadas cuotas 1 hasta ${n} de ${group.customerName}`);
    };

    // Resumen de la selección actual
    const selectedList = Object.values(selectedInstallments);
    const totalSelectedCount = selectedList.length;
    let selectedAmountARS = 0;
    let selectedAmountUSD = 0;
    const affectedSalesSet = new Set();

    selectedList.forEach(inst => {
        if (inst.saleId) affectedSalesSet.add(inst.saleId.toString());
        const amt = Number(inst.amount || 0);
        if (inst.currency === 'USD') selectedAmountUSD += amt;
        else selectedAmountARS += amt;
    });

    const affectedSalesCount = affectedSalesSet.size;

    // Confirmar regularización en lote
    const handleSubmitBatch = async (e) => {
        e.preventDefault();
        if (totalSelectedCount === 0) {
            toast.error('Seleccioná al menos una cuota para regularizar');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/installments/batch-regularize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    installments: selectedList.map(inst => ({
                        installmentId: inst._id,
                        saleId: inst.saleId
                    })),
                    reason,
                    cutoffDate
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al procesar el lote');
                return;
            }

            toast.success(`Lote regularizado: ${data.regularizedCount} cuotas procesadas sin alterar caja.`);
            setSelectedInstallments({});
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al regularizar lote.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Revertir lote completo
    const handleRevertBatch = async (batchId) => {
        if (!batchId) return;
        setIsReverting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/installments/batch-revert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    batchId,
                    reason: revertReason || 'Reversión manual solicitada por el usuario'
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al revertir el lote');
                return;
            }

            toast.success(`Lote revertido con éxito: ${data.revertedCount} cuotas reabiertas.`);
            setRevertingBatchId(null);
            setRevertReason('');
            fetchGroupedInstallments();
            if (onSuccess) onSuccess();
        } catch {
            toast.error('Error al revertir lote');
        } finally {
            setIsReverting(false);
        }
    };

    // Filtrar ventas por búsqueda
    const filteredGroups = salesGroups.filter(g => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            (g.customerName && g.customerName.toLowerCase().includes(q)) ||
            (g.vehicleInfo && g.vehicleInfo.toLowerCase().includes(q)) ||
            (g.saleNumber && g.saleNumber.toString().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-purple-500/30 bg-crm-surface shadow-2xl overflow-hidden">
                {/* Cabecera del Modal */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                            <Layers size={20} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white">Regularización Histórica de Cuotas en Lote</h3>
                                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                    Auditoría Segura
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Ordenar cuotas de ventas anteriores agrupadas por cliente sin duplicar ingresos en cuentas ni cajas.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Switch de Vistas */}
                <div className="flex items-center gap-2 px-5 pt-3 border-b border-crm-border text-xs font-bold shrink-0">
                    <button
                        type="button"
                        onClick={() => setViewMode('regularizar')}
                        className={`pb-2.5 px-3 border-b-2 transition-colors ${viewMode === 'regularizar' ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted hover:text-white'}`}
                    >
                        <FileCheck size={14} className="inline mr-1.5" />
                        Regularizar Cuotas Pendientes ({salesGroups.length} Ventas)
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('lotes_anteriores')}
                        className={`pb-2.5 px-3 border-b-2 transition-colors ${viewMode === 'lotes_anteriores' ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted hover:text-white'}`}
                    >
                        <RotateCcw size={14} className="inline mr-1.5" />
                        Lotes Aplicados y Reversión ({batchLogs.length})
                    </button>
                </div>

                {/* VISTA 1: REGULARIZACIÓN AGRUPADA */}
                {viewMode === 'regularizar' && (
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {/* Banner Informativo y Regla Estricta */}
                        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-xs text-purple-200 space-y-1">
                            <div className="flex items-center gap-2 font-bold text-white">
                                <ShieldAlert size={16} className="text-purple-300" />
                                <span>Aclaración de Auditoría Contable</span>
                            </div>
                            <p className="text-purple-200/90 leading-relaxed">
                                “Se registrarán como pagos históricos incluidos en el saldo inicial. <strong>No aumentarán la caja ni los fondos disponibles.</strong>”
                            </p>
                            <p className="text-[11px] text-crm-fg-muted">
                                Las cuotas vencidas no se asumen como pagadas automáticamente. Usa “Pagadas hasta la cuota N” o selecciona individualmente las cuotas salteadas que efectivamente se cobraron antes del corte.
                            </p>
                        </div>

                        {/* Parámetros de Regularización y Buscador */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Fecha de Corte / Regularización
                                </label>
                                <input
                                    type="date"
                                    value={cutoffDate}
                                    onChange={(e) => setCutoffDate(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Motivo del Lote
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Motivo de auditoría"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Filtrar por Cliente o Auto
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar..."
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg pl-8 pr-3 p-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                    />
                                    <Search size={14} className="absolute left-2.5 top-2.5 text-crm-fg-muted" />
                                </div>
                            </div>
                        </div>

                        {/* Lista de Ventas y Cuotas */}
                        {loadingGrouped ? (
                            <div className="py-12 text-center text-xs text-crm-fg-muted">
                                Cargando ventas con cuotas pendientes...
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="py-12 text-center text-xs text-crm-fg-muted border border-dashed border-crm-border rounded-2xl">
                                {salesGroups.length === 0
                                    ? 'No hay cuotas pendientes de regularización en el CRM.'
                                    : 'No se encontraron ventas con el término de búsqueda.'}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredGroups.map((group) => {
                                    const isExpanded = Boolean(expandedSales[group.saleId]);
                                    const totalInst = group.installments.length;
                                    const selectedCountInSale = group.installments.filter(i => selectedInstallments[i._id]).length;
                                    const allSelectedInSale = selectedCountInSale === totalInst && totalInst > 0;

                                    return (
                                        <div
                                            key={group.saleId}
                                            className="rounded-2xl border border-crm-border bg-crm-bg/70 overflow-hidden"
                                        >
                                            {/* Cabecera de la Venta */}
                                            <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-crm-surface/50 border-b border-crm-border/40">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpand(group.saleId)}
                                                        className="p-1 text-crm-fg-muted hover:text-white"
                                                    >
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white text-xs">
                                                                {group.customerName}
                                                            </span>
                                                            {group.saleNumber && (
                                                                <span className="text-[10px] text-crm-fg-muted">
                                                                    (Venta #{group.saleNumber})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-crm-fg-muted flex items-center gap-1.5 mt-0.5">
                                                            <Car size={13} className="text-purple-300" />
                                                            {group.vehicleInfo || 'Vehículo no especificado'} · Pendientes: <strong>{totalInst}</strong> ({formatMoney(group.totalPendingAmount, group.currency)})
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Controles Rápidos de la Venta */}
                                                <div className="flex flex-wrap items-center gap-2 pl-7 md:pl-0">
                                                    {/* Input Pagadas hasta N */}
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-crm-fg-muted font-bold whitespace-nowrap">
                                                            Hasta cuota:
                                                        </span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={totalInst + 20}
                                                            placeholder="N"
                                                            value={upToNInputs[group.saleId] || ''}
                                                            onChange={(e) => setUpToNInputs({ ...upToNInputs, [group.saleId]: e.target.value })}
                                                            className="w-14 rounded-lg border border-crm-border bg-crm-surface px-2 py-1 text-xs text-center font-bold text-white focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyUpToN(group)}
                                                            className="rounded-lg bg-purple-600/30 border border-purple-500/40 px-2 py-1 text-[11px] font-bold text-purple-200 hover:bg-purple-600/50"
                                                        >
                                                            Aplicar
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectAllInSale(group)}
                                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${allSelectedInSale ? 'bg-purple-600 text-white' : 'border border-crm-border bg-crm-surface text-crm-fg-muted hover:text-white'}`}
                                                    >
                                                        {allSelectedInSale ? 'Deseleccionar todas' : 'Todas'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Listado desplegable de cuotas */}
                                            {isExpanded && (
                                                <div className="p-3 divide-y divide-crm-border/30">
                                                    {group.installments.map((inst) => {
                                                        const isSelected = Boolean(selectedInstallments[inst._id]);
                                                        const isOverdue = inst.dueDate && new Date(inst.dueDate) < new Date();

                                                        return (
                                                            <div
                                                                key={inst._id}
                                                                onClick={() => handleToggleInstallment(inst)}
                                                                className={`py-2 px-3 flex items-center justify-between rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-purple-500/15 text-white' : 'hover:bg-crm-surface/40 text-crm-fg-muted'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => {}} // Manejado por onClick contenedor
                                                                        className="rounded border-crm-border text-purple-600 focus:ring-0 cursor-pointer"
                                                                    />
                                                                    <div>
                                                                        <span className="text-xs font-bold text-white mr-2">
                                                                            Cuota {inst.installmentNumber}
                                                                        </span>
                                                                        <span className="text-[11px] text-crm-fg-muted">
                                                                            Vence: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                                                                        </span>
                                                                        {isOverdue && (
                                                                            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                                                                                Vencida
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="text-right font-mono font-bold text-xs text-white">
                                                                    {formatMoney(inst.amount, inst.currency || group.currency)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* VISTA 2: LOTES ANTERIORES Y REVERSIÓN */}
                {viewMode === 'lotes_anteriores' && (
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-4 text-xs text-crm-fg-muted">
                            <p>
                                Aquí puedes auditar los lotes históricos aplicados. Si cometiste un error o se regularizaron cuotas por equivocación, puedes <strong>revertir el lote completo</strong> para que las cuotas vuelvan a su estado pendiente original.
                            </p>
                        </div>

                        {batchLogs.length === 0 ? (
                            <div className="py-12 text-center text-xs text-crm-fg-muted border border-dashed border-crm-border rounded-2xl">
                                No hay lotes de regularización registrados todavía.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {batchLogs.map((log) => {
                                    const isBeingReverted = log.isReverted;

                                    return (
                                        <div
                                            key={log._id || log.batchId}
                                            className={`rounded-2xl border p-4 ${isBeingReverted ? 'border-red-500/30 bg-red-500/5' : 'border-crm-border bg-crm-surface'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-purple-300">
                                                            Lote #{log.batchId}
                                                        </span>
                                                        {isBeingReverted ? (
                                                            <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 uppercase">
                                                                Revertido
                                                            </span>
                                                        ) : (
                                                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                                                Aplicado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-white mt-1">
                                                        {log.installmentsCount} cuotas · {log.salesCount} ventas afectadas · Total: {formatMoney(log.totalAmountARS, 'ARS')} {log.totalAmountUSD > 0 && `/ ${formatMoney(log.totalAmountUSD, 'USD')}`}
                                                    </p>
                                                    <p className="text-[11px] text-crm-fg-muted mt-0.5">
                                                        Fecha: {new Date(log.appliedAt).toLocaleString('es-AR')} · Aplicado por: {log.appliedBy}
                                                    </p>
                                                    <p className="text-[11px] text-crm-fg-muted italic mt-0.5">
                                                        Motivo: {log.reason}
                                                    </p>
                                                </div>

                                                {!isBeingReverted && (
                                                    <div className="shrink-0">
                                                        {revertingBatchId === log.batchId ? (
                                                            <div className="space-y-2 bg-crm-bg p-3 rounded-xl border border-red-500/40">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Motivo de la reversión"
                                                                    value={revertReason}
                                                                    onChange={(e) => setRevertReason(e.target.value)}
                                                                    className="w-full rounded-lg border border-crm-border bg-crm-surface px-2.5 py-1 text-xs text-white focus:outline-none"
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isReverting}
                                                                        onClick={() => handleRevertBatch(log.batchId)}
                                                                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                                                                    >
                                                                        {isReverting ? 'Revirtiendo...' : 'Confirmar Reversión'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setRevertingBatchId(null)}
                                                                        className="text-xs text-crm-fg-muted hover:text-white"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setRevertingBatchId(log.batchId)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-crm-red/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-crm-red/20 transition-colors"
                                                            >
                                                                <RotateCcw size={13} /> Revertir Lote
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Pie del Modal con Resumen de Selección y Botón de Confirmación */}
                {viewMode === 'regularizar' && (
                    <div className="p-4 border-t border-crm-border bg-crm-surface/90 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs">
                            <span className="text-crm-fg-muted">Selección preparada: </span>
                            <strong className="text-white font-bold">{totalSelectedCount} cuotas</strong>
                            <span className="text-crm-fg-muted"> en </span>
                            <strong className="text-white font-bold">{affectedSalesCount} ventas</strong>
                            <span className="text-crm-fg-muted"> · Total: </span>
                            <span className="font-mono font-bold text-purple-300">
                                {formatMoney(selectedAmountARS, 'ARS')}
                                {selectedAmountUSD > 0 && ` + ${formatMoney(selectedAmountUSD, 'USD')}`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitBatch}
                                disabled={isSubmitting || totalSelectedCount === 0}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-600/20"
                            >
                                <CheckCircle2 size={16} />
                                {isSubmitting ? 'Procesando Lote...' : `Confirmar Lote (${totalSelectedCount})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
