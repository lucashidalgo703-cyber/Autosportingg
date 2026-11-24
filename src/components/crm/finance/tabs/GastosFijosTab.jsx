import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Plus,
    CheckCircle2,
    Clock,
    AlertCircle,
    Edit2,
    Ban,
    RotateCcw,
    DollarSign,
    Search,
    Filter,
    Layers,
    Trash2,
    X,
    Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrmBadge from '../../ui/CrmBadge';
import ConfirmModal from '../../ui/ConfirmModal';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import { parseResponseSafe } from '../../../../utils/apiHelper';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CATEGORIES = [
    'Alquiler',
    'Servicios (Luz/Gas/Agua)',
    'Internet / Telefonía',
    'Impuestos y Tasas',
    'Honorarios Profesionales',
    'Sistemas / Software',
    'Mantenimiento / Limpieza',
    'Seguridad',
    'Sueldos Fijos',
    'Publicidad Fija',
    'Otros'
];

export default function GastosFijosTab({ accounts = [], onUpdated }) {
    const { user } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.FINANZAS_WRITE);
    const requestId = useRef(0);
    const today = useMemo(() => new Date(), []);
    const [period, setPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [data, setData] = useState({
        period: null,
        summary: {
            ars: { total: 0, paid: 0, pending: 0 },
            usd: { total: 0, paid: 0, pending: 0 },
            counts: { total: 0, paid: 0, pending: 0, annulled: 0 }
        },
        items: []
    });

    const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'pendiente' | 'pagado' | 'anulado'
    const [searchTerm, setSearchTerm] = useState('');

    // Modales
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [modifyMonthItem, setModifyMonthItem] = useState(null);
    const [payModalItem, setPayModalItem] = useState(null);
    const [confirmAnnulItem, setConfirmAnnulItem] = useState(null);
    const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [year, month] = useMemo(() => period.split('-').map(Number), [period]);

    const loadData = useCallback(async () => {
        const currentRequest = ++requestId.current;
        setLoading(true);
        setLoadError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/finance/fixed-expenses?period=${period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await parseResponseSafe(res);
            if (currentRequest === requestId.current) setData(d);
        } catch (err) {
            if (currentRequest === requestId.current) {
                setLoadError(err.message || 'No se pudieron cargar los gastos fijos');
            }
        } finally {
            if (currentRequest === requestId.current) setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadData();
        return () => { requestId.current += 1; };
    }, [loadData]);

    // Navegación de meses
    const handlePrevMonth = () => {
        let newY = year;
        let newM = month - 1;
        if (newM < 1) {
            newM = 12;
            newY -= 1;
        }
        setPeriod(`${newY}-${String(newM).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        let newY = year;
        let newM = month + 1;
        if (newM > 12) {
            newM = 1;
            newY += 1;
        }
        setPeriod(`${newY}-${String(newM).padStart(2, '0')}`);
    };

    const handleResetCurrentMonth = () => {
        const d = new Date();
        setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    // Actualizar estado / monto mensual
    const handleUpdateMonth = async (ruleId, updates) => {
        if (submitting || !canWrite) return false;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/finance/fixed-expenses/${ruleId}/month`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ period, ...updates })
            });
            await parseResponseSafe(res);
            toast.success('Gasto fijo actualizado');
            await loadData();
            if (onUpdated) {
                try { await onUpdated(); }
                catch { toast.error('El gasto se guardó. Recargá Finanzas para actualizar los saldos.'); }
            }
            return true;
        } catch (err) {
            toast.error(err.message || 'No se pudo actualizar el gasto fijo');
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    // Marcar como pendiente
    const handleMarkPending = async (item) => {
        await handleUpdateMonth(item.ruleId, { status: 'pendiente' });
    };

    // Anular gasto del mes
    const handleConfirmAnnul = async () => {
        if (!confirmAnnulItem) return;
        if (await handleUpdateMonth(confirmAnnulItem.ruleId, { status: 'anulado' })) setConfirmAnnulItem(null);
    };

    // Restaurar anulado
    const handleRestoreAnnulled = async (item) => {
        await handleUpdateMonth(item.ruleId, { status: 'pendiente' });
    };

    // Eliminar / Desactivar regla permanente
    const handleConfirmDelete = async () => {
        if (!confirmDeleteItem || submitting || !canWrite) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/finance/fixed-expenses/${confirmDeleteItem.ruleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await parseResponseSafe(res);
            toast.success('Gasto fijo desactivado');
            setConfirmDeleteItem(null);
            await loadData();
        } catch (err) {
            toast.error(err.message || 'No se pudo desactivar');
        } finally {
            setSubmitting(false);
        }
    };

    // Filtros
    const filteredItems = useMemo(() => {
        return (data.items || []).filter(item => {
            if (statusFilter !== 'todos' && item.status !== statusFilter) return false;
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchName = item.name?.toLowerCase().includes(q);
                const matchCat = item.category?.toLowerCase().includes(q);
                const matchNotes = item.notes?.toLowerCase().includes(q);
                if (!matchName && !matchCat && !matchNotes) return false;
            }
            return true;
        });
    }, [data.items, statusFilter, searchTerm]);

    const dataReady = !loading && !loadError && data.period === period;
    const busy = submitting || isCreateOpen || Boolean(modifyMonthItem || payModalItem || confirmAnnulItem || confirmDeleteItem);
    const formatMoney = (amount, currency = 'ARS') => {
        if (!dataReady) return '—';
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const isCurrent = period === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    return (
        <section className="space-y-6" aria-label="Gastos fijos mensuales" aria-busy={loading || submitting}>
            {/* Header de controles temporales y alta */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-crm-border bg-crm-bg p-1">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-crm-fg-muted hover:text-white hover:bg-crm-surface transition cursor-pointer"
                            title="Mes anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 text-sm font-bold text-white min-w-[130px] text-center select-none">
                            {MONTH_NAMES[month - 1]} {year}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-crm-fg-muted hover:text-white hover:bg-crm-surface transition cursor-pointer"
                            title="Mes siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {!isCurrent && (
                        <button
                            type="button"
                            onClick={handleResetCurrentMonth}
                            disabled={busy}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-crm-border bg-crm-surface-raised text-crm-fg hover:text-white transition"
                        >
                            Ir al mes actual
                        </button>
                    )}

                    <div className="text-xs text-crm-fg-subtle hidden lg:block">
                        Carga mensual automática con gestión de pagos y saldos a la fecha.
                    </div>
                </div>

                {canWrite && <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-crm-red-gradient px-4 py-2 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 cursor-pointer shrink-0"
                >
                    <Plus size={16} />
                    <span>Nuevo Gasto Fijo</span>
                </button>}
            </div>

            {/* Tarjetas de Resumen (KPIs): Total, Pagado a la fecha, Pendiente a la fecha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Totales del mes" aria-live="polite">
                {/* 1. Total Gastos Fijos */}
                <div data-fixed-expense-summary="total" className="rounded-2xl border border-crm-border bg-crm-surface p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                            Total Gastos Fijos (Mes)
                        </span>
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-white font-mono">
                            {formatMoney(data.summary?.ars?.total, 'ARS')}
                        </div>
                        {dataReady && data.summary?.usd?.total > 0 && (
                            <div className="text-sm font-bold text-neutral-400 font-mono mt-0.5">
                                + {formatMoney(data.summary?.usd?.total, 'USD')}
                            </div>
                        )}
                        <p className="text-xs text-crm-fg-subtle mt-2">
                            {dataReady ? `${data.summary?.counts?.total || 0} gastos fijos presupuestados para ${MONTH_NAMES[month - 1]}.` : loadError ? 'Totales no disponibles.' : 'Cargando totales del mes…'}
                        </p>
                    </div>
                </div>

                {/* 2. Total Pagado a la fecha */}
                <div data-fixed-expense-summary="paid" className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                            Total pagado del mes
                        </span>
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                            {formatMoney(data.summary?.ars?.paid, 'ARS')}
                        </div>
                        {dataReady && data.summary?.usd?.paid > 0 && (
                            <div className="text-sm font-bold text-emerald-300/80 font-mono mt-0.5">
                                + {formatMoney(data.summary?.usd?.paid, 'USD')}
                            </div>
                        )}
                        <p className="text-xs text-emerald-200/70 mt-2">
                            {dataReady ? `${data.summary?.counts?.paid || 0} de ${data.summary?.counts?.total || 0} gastos saldados.` : '—'}
                        </p>
                    </div>
                </div>

                {/* 3. Total Pendiente a la fecha */}
                <div data-fixed-expense-summary="pending" className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                            Total pendiente del mes
                        </span>
                        <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-amber-400 font-mono">
                            {formatMoney(data.summary?.ars?.pending, 'ARS')}
                        </div>
                        {dataReady && data.summary?.usd?.pending > 0 && (
                            <div className="text-sm font-bold text-amber-300/80 font-mono mt-0.5">
                                + {formatMoney(data.summary?.usd?.pending, 'USD')}
                            </div>
                        )}
                        <p className="text-xs text-amber-200/70 mt-2">
                            {dataReady ? `${data.summary?.counts?.pending || 0} obligaciones por abonar.` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                        { id: 'todos', label: 'Todos', count: (data.summary?.counts?.total || 0) + (data.summary?.counts?.annulled || 0) },
                        { id: 'pendiente', label: 'Pendientes', count: data.summary?.counts?.pending },
                        { id: 'pagado', label: 'Pagados', count: data.summary?.counts?.paid },
                        { id: 'anulado', label: 'Anulados', count: data.summary?.counts?.annulled }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusFilter(tab.id)}
                            aria-pressed={statusFilter === tab.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                                statusFilter === tab.id
                                    ? 'bg-crm-surface-raised text-white border border-crm-border shadow-sm'
                                    : 'text-crm-fg-muted hover:text-white hover:bg-crm-surface'
                            }`}
                        >
                            {tab.label} {dataReady && tab.count !== undefined ? `(${tab.count})` : ''}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o rubro..."
                        aria-label="Buscar gastos fijos"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-crm-surface border border-crm-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-crm-red transition"
                    />
                </div>
            </div>

            {/* Tabla de Gastos Fijos */}
            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                {loadError ? (
                    <div role="alert" className="space-y-3 p-8 text-center text-sm text-crm-fg">
                        <p>{loadError}</p>
                        <button type="button" onClick={loadData} className="rounded-lg border border-crm-border px-4 py-2">Reintentar</button>
                    </div>
                ) : !dataReady ? (
                    <div className="flex h-56 items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                            <span className="text-xs text-crm-fg-muted font-medium">Cargando gastos fijos...</span>
                        </div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-crm-surface-raised flex items-center justify-center text-crm-fg-muted mb-3 border border-crm-border">
                            <Layers size={22} />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">No hay gastos fijos para este criterio</h4>
                        <p className="text-xs text-crm-fg-subtle max-w-sm mb-4">
                            {searchTerm || statusFilter !== 'todos'
                                ? 'No se encontraron resultados para los filtros seleccionados.'
                                : `No hay gastos fijos registrados en ${MONTH_NAMES[month - 1]}. Creá tu primer gasto fijo con el botón superior.`}
                        </p>
                        {canWrite && statusFilter === 'todos' && !searchTerm && (
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-crm-surface-raised border border-crm-border px-3.5 py-2 text-xs font-bold text-white hover:border-zinc-500 transition cursor-pointer"
                            >
                                <Plus size={14} /> Crear primer gasto fijo
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                            <thead className="bg-crm-surface-raised/80 border-b border-crm-border text-[10px] font-black uppercase tracking-wider text-crm-fg-muted select-none">
                                <tr>
                                    <th className="py-3 px-4">Día / Vencimiento</th>
                                    <th className="py-3 px-4">Concepto / Rubro</th>
                                    <th className="py-3 px-4">Monto Pactado</th>
                                    <th className="py-3 px-4">Estado</th>
                                    <th className="py-3 px-4">Pago Asentado</th>
                                    <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border">
                                {filteredItems.map(item => {
                                    const isPaid = item.status === 'pagado';
                                    const isAnnulled = item.status === 'anulado';
                                    const isPending = item.status === 'pendiente';

                                    return (
                                        <tr key={item.instanceId || item.ruleId} className={`hover:bg-crm-surface-raised/50 transition-colors ${isAnnulled ? 'opacity-50' : ''}`}>
                                            {/* Día de vencimiento */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-white bg-crm-bg border border-crm-border px-2 py-0.5 rounded text-[11px]">
                                                        Día {item.dueDay}
                                                    </span>
                                                    <span className="text-crm-fg-subtle text-[11px]">
                                                        {item.dueDay}/{String(month).padStart(2, '0')}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Concepto y Categoría */}
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm ${isAnnulled ? 'line-through text-neutral-400' : 'text-white'}`}>
                                                        {item.name}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-crm-fg-muted font-medium bg-crm-surface-raised px-1.5 py-0.2 rounded border border-crm-border">
                                                            {item.category}
                                                        </span>
                                                        {item.accountName && (
                                                            <span className="text-[10px] text-crm-fg-subtle">
                                                                · {item.accountName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Monto pactado */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-mono font-bold text-sm ${isAnnulled ? 'text-neutral-500' : 'text-white'}`}>
                                                        {formatMoney(item.amount, item.currency)}
                                                    </span>
                                                    {item.isModified && !isAnnulled && (
                                                        <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 rounded" title={`Base original: ${formatMoney(item.baseAmount, item.currency)}`}>
                                                            Ajustado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Estado */}
                                            <td className="py-3 px-4">
                                                {isPaid ? (
                                                    <CrmBadge variant="success">PAGADO</CrmBadge>
                                                ) : isAnnulled ? (
                                                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded">
                                                        ANULADO
                                                    </span>
                                                ) : (
                                                    <CrmBadge variant="warning">PENDIENTE</CrmBadge>
                                                )}
                                            </td>

                                            {/* Detalle de pago */}
                                            <td className="py-3 px-4">
                                                {isPaid ? (
                                                    <div className="flex flex-col text-[11px]">
                                                        <span className="font-semibold text-emerald-400">
                                                            {item.paidAt ? new Date(item.paidAt).toLocaleDateString('es-AR') : 'Saldado'}
                                                        </span>
                                                        <span className="text-crm-fg-subtle text-[10px]">
                                                            {item.paymentMethod || 'Efectivo'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-crm-fg-subtle text-[11px]">—</span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="py-3 px-4 text-right">
                                                {canWrite && <div className="flex items-center justify-end gap-1.5" inert={submitting || undefined}>
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPayModalItem(item)}
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-sm cursor-pointer"
                                                                title="Pagar gasto fijo"
                                                            >
                                                                Pagar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setModifyMonthItem(item)}
                                                                className="px-2 py-1 rounded-lg border border-crm-border bg-crm-surface-raised hover:bg-neutral-700 text-neutral-300 hover:text-white font-semibold text-[11px] transition cursor-pointer"
                                                                title="Modificar importe de este mes"
                                                            >
                                                                Modificar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setConfirmAnnulItem(item)}
                                                                className="px-2 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold transition cursor-pointer"
                                                                title="Anular gasto este mes"
                                                            >
                                                                Anular
                                                            </button>
                                                        </>
                                                    )}

                                                    {isPaid && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarkPending(item)}
                                                            className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-[11px] transition cursor-pointer"
                                                            title="Revertir y marcar como pendiente"
                                                        >
                                                            Volver a pendiente
                                                        </button>
                                                    )}

                                                    {isAnnulled && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRestoreAnnulled(item)}
                                                            className="px-2.5 py-1 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[11px] font-semibold transition cursor-pointer"
                                                            title="Restaurar a pendiente"
                                                        >
                                                            Restaurar
                                                        </button>
                                                    )}

                                                    {/* Desactivar regla permanente */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteItem(item)}
                                                        className="p-1 rounded-lg text-crm-fg-subtle hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                                        title="Desactivar gasto fijo para los próximos meses"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Crear Nuevo Gasto Fijo Recurrente */}
            {isCreateOpen && (
                <CreateFixedExpenseModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    accounts={accounts}
                    period={period}
                    onCreated={loadData}
                />
            )}

            {/* Modal: Modificar Importe de este Mes */}
            {modifyMonthItem && (
                <ModifyMonthExpenseModal
                    isOpen={Boolean(modifyMonthItem)}
                    onClose={() => setModifyMonthItem(null)}
                    item={modifyMonthItem}
                    period={period}
                    onSave={async (newAmount, notes) => {
                        if (await handleUpdateMonth(modifyMonthItem.ruleId, { amount: newAmount, notes })) setModifyMonthItem(null);
                    }}
                />
            )}

            {/* Modal: Pagar Gasto Fijo */}
            {payModalItem && (
                <PayFixedExpenseModal
                    isOpen={Boolean(payModalItem)}
                    onClose={() => setPayModalItem(null)}
                    item={payModalItem}
                    accounts={accounts}
                    onConfirm={async (payData) => {
                        const saved = await handleUpdateMonth(payModalItem.ruleId, {
                            status: 'pagado',
                            paidAt: payData.paidAt,
                            paymentMethod: payData.paymentMethod,
                            accountId: payData.accountId,
                            registerMovement: payData.registerMovement
                        });
                        if (saved) setPayModalItem(null);
                    }}
                />
            )}

            {/* Confirmar Anulación del mes */}
            <ConfirmModal
                isOpen={Boolean(confirmAnnulItem)}
                onClose={() => setConfirmAnnulItem(null)}
                onConfirm={handleConfirmAnnul}
                title="Anular Gasto Fijo de este Mes"
                message={`¿Deseas anular "${confirmAnnulItem?.name}" únicamente para el período ${period}? No se sumará a los pendientes y volverá a generarse automáticamente el mes próximo.`}
                confirmText="Anular este mes"
                isDestructive={true}
            />

            {/* Confirmar Eliminación permanente */}
            <ConfirmModal
                isOpen={Boolean(confirmDeleteItem)}
                onClose={() => setConfirmDeleteItem(null)}
                onConfirm={handleConfirmDelete}
                title="Desactivar Gasto Fijo"
                message={`¿Deseás desactivar "${confirmDeleteItem?.name}"? Se conservarán los registros existentes y dejará de generarse en nuevos meses.`}
                confirmText="Desactivar"
                isConfirmDisabled={submitting}
                isDestructive={true}
            />
        </section>
    );
}

// ----------------------------------------------------
// Modal 1: Crear Nuevo Gasto Fijo
// ----------------------------------------------------
function CreateFixedExpenseModal({ isOpen, onClose, accounts = [], onCreated, period }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('ARS');
    const [dueDay, setDueDay] = useState('10');
    const [defaultAccountId, setDefaultAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!name.trim()) return toast.error('Ingresá el nombre del gasto fijo');
        if (!amount || Number(amount) <= 0) return toast.error('Ingresá un monto mayor a 0');

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/finance/fixed-expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    period,
                    name: name.trim(),
                    category,
                    amount: Number(amount),
                    currency,
                    dueDay: Number(dueDay),
                    defaultAccountId: defaultAccountId || undefined,
                    notes: notes.trim()
                })
            });
            await parseResponseSafe(res);
            toast.success('Gasto fijo creado con éxito');
            onClose();
            await onCreated();
        } catch (err) {
            toast.error(err.message || 'No se pudo crear');
        } finally {
            setSubmitting(false);
        }
    };

    const compatibleAccounts = accounts.filter(a => a.currency === currency && a.isActive !== false);

    return (
        <div role="dialog" aria-modal="true" aria-label="Nuevo gasto fijo mensual" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <Plus size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white">Nuevo Gasto Fijo Mensual</h3>
                            <p className="text-xs text-crm-fg-muted">Desde el período {period}</p>
                        </div>
                    </div>
                    <button type="button" aria-label="Cerrar" disabled={submitting} onClick={onClose} className="text-crm-fg-muted hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                        <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                            Nombre del gasto *
                        </label>
                        <input
                            type="text"
                            aria-label="Nombre del gasto"
                            autoFocus
                            required
                            placeholder="Ej: Alquiler Salón, Luz Edesur, Internet Fibertel..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-crm-red transition"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                                Rubro / Categoría
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-crm-red transition cursor-pointer"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                                Día de vencimiento (1-31)
                            </label>
                            <input
                                type="number"
                                aria-label="Día de vencimiento"
                                required
                                min="1"
                                max="31"
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-crm-red transition font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                                Monto base *
                            </label>
                            <input
                                type="number"
                                aria-label="Monto base"
                                required
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-crm-red transition font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                                Moneda
                            </label>
                            <select
                                value={currency}
                                aria-label="Moneda"
                                onChange={(e) => { setCurrency(e.target.value); setDefaultAccountId(''); }}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-crm-red transition cursor-pointer"
                            >
                                <option value="ARS">ARS ($)</option>
                                <option value="USD">USD (U$S)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                            Cuenta sugerida (opcional)
                        </label>
                        <select
                            value={defaultAccountId}
                            onChange={(e) => setDefaultAccountId(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crm-red transition cursor-pointer"
                        >
                            <option value="">-- Sin cuenta asignada --</option>
                            {compatibleAccounts.map(a => (
                                <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                            Notas u observaciones
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Número de cliente, débito automático..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crm-red transition"
                        />
                    </div>

                    <div className="pt-3 border-t border-crm-border flex justify-end gap-2">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl bg-crm-red-gradient text-xs font-black text-white hover:opacity-95 transition cursor-pointer disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Crear Gasto Fijo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// Modal 2: Modificar Importe de este Mes
// ----------------------------------------------------
function ModifyMonthExpenseModal({ isOpen, onClose, item, period, onSave }) {
    const [amount, setAmount] = useState(item?.amount ?? '');
    const [notes, setNotes] = useState(item?.notes || '');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !item) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (amount === '' || !Number.isFinite(Number(amount)) || Number(amount) < 0) return toast.error('Ingresá un monto válido');
        setSubmitting(true);
        try {
            await onSave(Number(amount), notes);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Modificar importe del mes" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <Edit2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white">Modificar Monto</h3>
                            <p className="text-[11px] text-crm-fg-subtle">Período {period}</p>
                        </div>
                    </div>
                    <button type="button" aria-label="Cerrar" disabled={submitting} onClick={onClose} className="text-crm-fg-muted hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div>
                        <span className="text-[11px] font-bold text-crm-fg-muted uppercase block mb-1">Gasto:</span>
                        <p className="text-sm font-bold text-white">{item.name}</p>
                        <p className="text-[11px] text-crm-fg-subtle mt-0.5">Base pactada: {item.currency} {Number(item.baseAmount).toLocaleString('es-AR')}</p>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                            Monto para este mes ({item.currency}) *
                        </label>
                        <input
                            type="number"
                            aria-label="Monto para este mes"
                            required
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-crm-red transition font-mono font-bold"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                            Motivo del ajuste / Nota
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Aumento tarifario, factura real..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crm-red transition"
                        />
                    </div>

                    <div className="pt-3 border-t border-crm-border flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-black text-white hover:bg-blue-500 transition cursor-pointer disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Aplicar cambio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// Modal 3: Pagar Gasto Fijo
// ----------------------------------------------------
function PayFixedExpenseModal({ isOpen, onClose, item, accounts = [], onConfirm }) {
    const [accountId, setAccountId] = useState(item?.accountId || '');
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [registerMovement, setRegisterMovement] = useState(Boolean(item?.accountId));
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !item) return null;

    const compatibleAccounts = accounts.filter(a => a.currency === item.currency && a.isActive !== false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (registerMovement && !compatibleAccounts.some(account => account._id === accountId)) {
            return toast.error('Seleccioná una cuenta de egreso');
        }
        setSubmitting(true);
        try {
            await onConfirm({
                paidAt: new Date().toISOString(),
                paymentMethod,
                accountId: registerMovement ? accountId : undefined,
                registerMovement
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Pagar gasto fijo" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white">Saldar Gasto Fijo</h3>
                            <p className="text-[11px] text-crm-fg-subtle">{item.name}</p>
                        </div>
                    </div>
                    <button type="button" aria-label="Cerrar" disabled={submitting} onClick={onClose} className="text-crm-fg-muted hover:text-white transition">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div className="p-3 rounded-xl bg-crm-bg border border-crm-border flex justify-between items-center">
                        <span className="text-xs text-crm-fg-muted font-bold">Monto a abonar:</span>
                        <span className="text-base font-black text-emerald-400 font-mono">
                            {item.currency} {Number(item.amount).toLocaleString('es-AR')}
                        </span>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={registerMovement}
                                onChange={(e) => setRegisterMovement(e.target.checked)}
                                className="w-4 h-4 rounded border-crm-border bg-crm-bg text-crm-red"
                            />
                            <span className="text-xs font-bold text-white">Registrar egreso en caja / cuenta</span>
                        </label>
                    </div>

                    {registerMovement && (
                        <div>
                            <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                                Cuenta de Egreso
                            </label>
                            <select
                                value={accountId}
                                aria-label="Cuenta de egreso"
                                required
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crm-red transition cursor-pointer"
                            >
                                <option value="">Seleccioná una cuenta</option>
                                {compatibleAccounts.map(a => (
                                    <option key={a._id} value={a._id}>
                                        {a.name} (Saldo: {a.currency} {Number(a.balance).toLocaleString('es-AR')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                            Método de pago
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-crm-red transition cursor-pointer"
                        >
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia bancaria</option>
                            <option value="debito_automatico">Débito automático</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div className="pt-3 border-t border-crm-border flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white transition cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                            {submitting ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
