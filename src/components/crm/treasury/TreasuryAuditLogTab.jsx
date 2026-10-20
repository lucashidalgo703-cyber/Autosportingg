"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    History,
    Search,
    Filter,
    RotateCcw,
    Calendar,
    User,
    ArrowRightLeft,
    Edit3,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(amount || 0)));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
}

const ACTION_LABELS = {
    ajuste_saldo: { label: 'Ajuste de Saldo', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    transferencia_entre_cajas: { label: 'Transferencia', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    edicion_configuracion: { label: 'Edición Config.', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    distribucion_cobro: { label: 'Cobro Distribuido', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    reversion_ajuste: { label: 'Reversión Ajuste', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    reversion_cobro: { label: 'Reversión Cobro', badge: 'bg-red-500/20 text-red-300 border-red-500/30' }
};

const BOX_NAMES = {
    operativa: 'Caja Operativa',
    impuestos: 'Caja Impuestos',
    deudas: 'Caja Deudas',
    personal: 'Caja Personal',
    postventa: 'Caja Postventa',
    reserva: 'Caja Reserva',
    stock: 'Caja Stock',
    crecimiento: 'Caja Crecimiento'
};

export default function TreasuryAuditLogTab({ treasuryToken }) {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Filters
    const [boxFilter, setBoxFilter] = useState('todas');
    const [actionFilter, setActionFilter] = useState('todos');
    const [userFilter, setUserFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Detail Modal & Revert Modal
    const [selectedLog, setSelectedLog] = useState(null);
    const [revertPromptLog, setRevertPromptLog] = useState(null);
    const [revertReason, setRevertReason] = useState('');
    const [isReverting, setIsReverting] = useState(false);

    const fetchHistory = useCallback(async (targetPage = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('page', String(targetPage));
            params.append('limit', '15');
            if (boxFilter && boxFilter !== 'todas') params.append('boxKey', boxFilter);
            if (actionFilter && actionFilter !== 'todos') params.append('actionType', actionFilter);
            if (userFilter.trim()) params.append('user', userFilter.trim());
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`/api/admin/tesoreria-estrategica/history?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                }
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setLogs(data.items || []);
                setTotal(data.total || 0);
                setPage(data.page || 1);
                setPages(data.pages || 1);
            } else {
                toast.error(data.message || 'Error al consultar historial de auditoría');
            }
        } catch {
            toast.error('Error de conexión al consultar auditoría');
        } finally {
            setLoading(false);
        }
    }, [boxFilter, actionFilter, userFilter, startDate, endDate, treasuryToken]);

    useEffect(() => {
        fetchHistory(1);
    }, [fetchHistory]);

    const handleApplyFilters = (e) => {
        e.preventDefault();
        fetchHistory(1);
    };

    const handleResetFilters = () => {
        setBoxFilter('todas');
        setActionFilter('todos');
        setUserFilter('');
        setStartDate('');
        setEndDate('');
    };

    const handleConfirmRevert = async (e) => {
        e.preventDefault();
        if (!revertReason || !revertReason.trim()) {
            toast.error('El motivo de la reversión es obligatorio');
            return;
        }

        setIsReverting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/adjustments/revert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    logId: revertPromptLog._id,
                    reason: revertReason.trim()
                })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al revertir la operación');
                return;
            }

            toast.success(data.message || 'Operación revertida con éxito');
            setRevertPromptLog(null);
            setRevertReason('');
            setSelectedLog(null);
            fetchHistory(page);
        } catch {
            toast.error('Error de conexión al revertir');
        } finally {
            setIsReverting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header del Registro de Auditoría */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                        <History size={18} className="text-purple-400" />
                        Historial Completo y Auditoría de Tesorería Estratégica
                    </h2>
                    <p className="text-xs text-crm-fg-muted mt-0.5">
                        Registro permanente e inmutable de ajustes de saldo, transferencias entre cajas, cambios de configuración y reversiones.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => fetchHistory(page)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Filtros de Auditoría */}
            <form onSubmit={handleApplyFilters} className="rounded-2xl border border-crm-border bg-crm-surface p-4 text-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Caja */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Caja Estratégica
                        </label>
                        <select
                            value={boxFilter}
                            onChange={(e) => setBoxFilter(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                        >
                            <option value="todas">Todas las cajas</option>
                            {Object.entries(BOX_NAMES).map(([k, name]) => (
                                <option key={k} value={k}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tipo de Acción */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Tipo de Acción
                        </label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                        >
                            <option value="todos">Todas las acciones</option>
                            <option value="ajuste_saldo">Ajuste de saldo</option>
                            <option value="transferencia_entre_cajas">Transferencia entre cajas</option>
                            <option value="edicion_configuracion">Edición de configuración</option>
                            <option value="distribucion_cobro">Cobro distribuido</option>
                            <option value="reversion_ajuste">Reversión de ajuste</option>
                            <option value="reversion_cobro">Reversión de cobro</option>
                        </select>
                    </div>

                    {/* Usuario */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Usuario / Operador
                        </label>
                        <input
                            type="text"
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            placeholder="Buscar por usuario..."
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Fecha Desde */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Desde
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Fecha Hasta */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-crm-border/50">
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        className="rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                    >
                        Limpiar Filtros
                    </button>
                    <button
                        type="submit"
                        className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-md shadow-purple-600/20"
                    >
                        Filtrar
                    </button>
                </div>
            </form>

            {/* Tabla de Historial */}
            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="p-3.5 border-b border-crm-border bg-crm-bg flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-crm-fg">
                        Movimientos Registrados ({total})
                    </span>
                    <span className="text-[11px] text-crm-fg-muted">
                        Página {page} de {pages}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-crm-border bg-crm-bg/60 text-crm-fg-muted font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="p-3">Fecha y Hora</th>
                                <th className="p-3">Acción</th>
                                <th className="p-3">Caja(s)</th>
                                <th className="p-3 text-right">Variación</th>
                                <th className="p-3 text-right">Saldo Ant. → Post.</th>
                                <th className="p-3">Motivo Obligatorio</th>
                                <th className="p-3">Usuario</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-crm-fg-muted">
                                        <RefreshCw size={18} className="animate-spin inline-block mr-2" />
                                        Cargando auditoría...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-crm-fg-muted italic">
                                        No se encontraron registros de auditoría con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((item) => {
                                    const actionMeta = ACTION_LABELS[item.actionType] || { label: item.actionType, badge: 'bg-crm-surface text-crm-fg' };
                                    const isPositive = (item.amount || 0) > 0;
                                    const isNegative = (item.amount || 0) < 0;

                                    return (
                                        <tr key={item._id} className="hover:bg-crm-surface-raised transition-colors">
                                            <td className="p-3 whitespace-nowrap text-crm-fg-muted">
                                                {item.date ? new Date(item.date).toLocaleString('es-AR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : '-'}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionMeta.badge}`}>
                                                    {actionMeta.label}
                                                </span>
                                                {item.isReversal && (
                                                    <span className="ml-1 rounded bg-red-500/20 px-1.5 py-0.2 text-[9px] font-black text-red-300">
                                                        REVERSIÓN
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 whitespace-nowrap font-bold text-white">
                                                {item.boxName || BOX_NAMES[item.boxKey] || item.boxKey}
                                                {item.targetBoxName && (
                                                    <span className="text-crm-fg-muted font-normal">
                                                        {' → '}{item.targetBoxName}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-right font-mono font-bold">
                                                {item.amount !== undefined && item.amount !== null ? (
                                                    <span className={isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-crm-fg-muted'}>
                                                        {isPositive ? '+' : ''}{formatMoney(item.amount, item.currency || 'ARS')}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-right font-mono text-crm-fg-muted text-[11px]">
                                                {item.balanceBefore !== undefined && item.balanceAfter !== undefined ? (
                                                    <span>
                                                        {formatMoney(item.balanceBefore, item.currency || 'ARS')} → <strong className="text-white">{formatMoney(item.balanceAfter, item.currency || 'ARS')}</strong>
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 max-w-xs truncate text-crm-fg" title={item.reason}>
                                                {item.reason}
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-crm-fg-muted">
                                                {item.user} <span className="text-[10px]">({item.userRole})</span>
                                            </td>
                                            <td className="p-3 whitespace-nowrap text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLog(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-crm-border bg-crm-bg px-2 py-1 text-[11px] font-bold text-crm-fg hover:bg-crm-surface hover:text-white transition-colors"
                                                >
                                                    <Eye size={12} /> Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {pages > 1 && (
                    <div className="p-3 border-t border-crm-border bg-crm-bg flex items-center justify-between text-xs">
                        <button
                            type="button"
                            disabled={page <= 1 || loading}
                            onClick={() => fetchHistory(page - 1)}
                            className="inline-flex items-center gap-1 rounded-xl border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-bold text-crm-fg hover:text-white disabled:opacity-40 transition-colors"
                        >
                            <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="font-bold text-crm-fg-muted">
                            Página {page} de {pages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= pages || loading}
                            onClick={() => fetchHistory(page + 1)}
                            className="inline-flex items-center gap-1 rounded-xl border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-bold text-crm-fg hover:text-white disabled:opacity-40 transition-colors"
                        >
                            Siguiente <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Detalle Completo de Registro de Auditoría */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
                    <div className="my-8 w-full max-w-lg rounded-3xl border border-purple-500/30 bg-crm-surface p-6 shadow-2xl space-y-4">
                        <div className="flex items-start justify-between pb-3 border-b border-crm-border">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                    Registro Inmutable de Auditoría
                                </span>
                                <h3 className="text-base font-black text-white">Detalle de Operación #{selectedLog.operationId || selectedLog._id}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="text-crm-fg-muted hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                    <span className="text-[10px] text-crm-fg-muted block">Tipo de Acción</span>
                                    <strong className="text-white">
                                        {ACTION_LABELS[selectedLog.actionType]?.label || selectedLog.actionType}
                                    </strong>
                                </div>
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                    <span className="text-[10px] text-crm-fg-muted block">Fecha y Hora</span>
                                    <strong className="text-white">
                                        {new Date(selectedLog.date).toLocaleString('es-AR')}
                                    </strong>
                                </div>
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                    <span className="text-[10px] text-crm-fg-muted block">Usuario / Operador</span>
                                    <strong className="text-white">{selectedLog.user} ({selectedLog.userRole})</strong>
                                </div>
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                    <span className="text-[10px] text-crm-fg-muted block">Caja Principal</span>
                                    <strong className="text-purple-300">{selectedLog.boxName || selectedLog.boxKey}</strong>
                                </div>
                            </div>

                            {/* Saldos e Importe si aplica */}
                            {selectedLog.amount !== undefined && (
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-3 grid grid-cols-3 gap-2">
                                    <div>
                                        <span className="text-[10px] text-crm-fg-muted block">Saldo Anterior</span>
                                        <p className="font-mono font-bold text-white">
                                            {formatMoney(selectedLog.balanceBefore, selectedLog.currency || 'ARS')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-crm-fg-muted block">Variación</span>
                                        <p className={`font-mono font-bold ${(selectedLog.amount || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {(selectedLog.amount || 0) > 0 ? '+' : ''}{formatMoney(selectedLog.amount, selectedLog.currency || 'ARS')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-crm-fg-muted block">Saldo Posterior</span>
                                        <p className="font-mono font-bold text-emerald-400">
                                            {formatMoney(selectedLog.balanceAfter, selectedLog.currency || 'ARS')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Campos Modificados de Configuración si aplica */}
                            {selectedLog.fieldsModified && selectedLog.fieldsModified.length > 0 && (
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-3 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                                        Campos Modificados en la Configuración
                                    </span>
                                    <div className="space-y-1">
                                        {selectedLog.fieldsModified.map((f, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-[11px] border-b border-crm-border/40 pb-1">
                                                <span className="text-crm-fg font-medium">{f.fieldLabel || f.fieldName}:</span>
                                                <span className="font-mono text-crm-fg-muted">
                                                    {String(f.previousValue ?? '-')} → <strong className="text-white">{String(f.newValue ?? '-')}</strong>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Motivo Obligatorio Registrado */}
                            <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block mb-1">
                                    Motivo Obligatorio Registrado
                                </span>
                                <p className="text-white italic">
                                    "{selectedLog.reason}"
                                </p>
                            </div>

                            {/* Vínculos */}
                            {(selectedLog.saleId || selectedLog.incomeId || selectedLog.revertedLogId) && (
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-3 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                                        Vínculos de la Operación
                                    </span>
                                    {selectedLog.saleId && <p className="text-[11px] text-crm-fg">Venta ID: <span className="font-mono text-purple-300">{String(selectedLog.saleId)}</span></p>}
                                    {selectedLog.incomeId && <p className="text-[11px] text-crm-fg">Cobro ID: <span className="font-mono text-emerald-300">{String(selectedLog.incomeId)}</span></p>}
                                    {selectedLog.revertedLogId && <p className="text-[11px] text-crm-fg">Reversión de Movimiento ID: <span className="font-mono text-amber-300">{String(selectedLog.revertedLogId)}</span></p>}
                                </div>
                            )}
                        </div>

                        {/* Botones de acción del detalle */}
                        <div className="flex items-center justify-between pt-3 border-t border-crm-border">
                            <div>
                                {!selectedLog.isReversal && ['ajuste_saldo', 'transferencia_entre_cajas'].includes(selectedLog.actionType) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRevertPromptLog(selectedLog);
                                            setRevertReason(`Corrección de ${ACTION_LABELS[selectedLog.actionType]?.label || 'movimiento'}`);
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25 transition-colors"
                                    >
                                        <RotateCcw size={13} /> Revertir este Ajuste
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-xl border border-crm-border bg-crm-surface-raised px-4 py-1.5 text-xs font-bold text-crm-fg hover:text-white"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Reversión */}
            {revertPromptLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-crm-surface p-6 shadow-2xl space-y-4">
                        <div className="flex items-start justify-between pb-3 border-b border-crm-border">
                            <div className="flex items-center gap-2 text-red-400">
                                <RotateCcw size={18} />
                                <h3 className="text-base font-black text-white">Revertir Operación</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRevertPromptLog(null)}
                                className="text-crm-fg-muted hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-crm-fg-muted leading-relaxed">
                            Estás a punto de revertir el movimiento registrado en <strong className="text-white">{revertPromptLog.boxName || revertPromptLog.boxKey}</strong> por <strong className="text-white">{formatMoney(revertPromptLog.amount, revertPromptLog.currency || 'ARS')}</strong>. Se restituirá el saldo anterior y se creará un registro de reversión vinculado permanentemente.
                        </p>

                        <form onSubmit={handleConfirmRevert} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Motivo Obligatorio de la Reversión *
                                </label>
                                <input
                                    type="text"
                                    value={revertReason}
                                    onChange={(e) => setRevertReason(e.target.value)}
                                    placeholder="Ej: Corrección por importe ingresado incorrectamente"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-crm-border">
                                <button
                                    type="button"
                                    onClick={() => setRevertPromptLog(null)}
                                    className="rounded-xl border border-crm-border bg-crm-bg px-3 py-1.5 text-xs font-bold text-crm-fg-muted hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReverting || !revertReason.trim()}
                                    className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-black text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                                >
                                    {isReverting ? 'Revirtiendo...' : 'Confirmar Reversión'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
