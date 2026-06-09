"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
    Banknote,
    BarChart3,
    Briefcase,
    CalendarDays,
    Car,
    CheckCircle2,
    CreditCard,
    Flame,
    HandCoins,
    Landmark,
    Plus,
    Receipt,
    Repeat,
    Trophy,
    Users,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';

const TAB_MI_DIA = 'Mi d\u00eda';
const TODAY = () => new Date().toISOString().split('T')[0];

const PERSONAL_MARKERS = {
    urgent: '[MI_ESPACIO_URGENTE]',
    debt: '[MI_ESPACIO_DEUDA]',
    fixedExpense: '[MI_ESPACIO_GASTO_FIJO]',
    installmentPay: '[MI_ESPACIO_CUOTA_PAGAR]',
    installmentCollect: '[MI_ESPACIO_CUOTA_COBRAR]',
    personalCar: '[MI_ESPACIO_AUTO]',
    pending: '[MI_ESPACIO_PENDIENTE]',
    event: '[MI_ESPACIO_EVENTO]',
    contact: '[MI_ESPACIO_CONTACTO]'
};

const tabs = [
    { label: TAB_MI_DIA, icon: BarChart3 },
    { label: 'Mis ventas', icon: Trophy },
    { label: 'URGENTE', icon: Flame },
    { label: 'Pagos realizados', icon: Wallet },
    { label: 'Deudas', icon: HandCoins },
    { label: 'Gastos fijos', icon: Receipt },
    { label: 'Cuotas a pagar', icon: CreditCard },
    { label: 'Cuotas a cobrar', icon: HandCoins },
    { label: 'Saldo agencia', icon: Repeat },
    { label: 'Mis autos', icon: Car },
    { label: 'Patrimonio', icon: BarChart3 },
    { label: 'Pendientes', icon: CheckCircle2 },
    { label: 'Calendario', icon: CalendarDays },
    { label: 'Contactos', icon: Users }
];

const formatMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const isSameMonth = (value, baseDate) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === baseDate.getMonth() && date.getFullYear() === baseDate.getFullYear();
};

const isToday = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

const getDateOnly = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const isWithinNext7Days = (value) => {
    const date = getDateOnly(value);
    if (!date) return false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return date >= start && date <= end;
};

const money = (value, currency = 'ARS') => {
    const number = Number(value || 0);
    const symbol = currency === 'USD' ? 'USD' : '$';
    return `${symbol} ${number.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

const sumAmount = (items, currency = null) => (
    items
        .filter((item) => !currency || item.currency === currency || item.saleCurrency === currency)
        .reduce((acc, item) => acc + Number(item.amount || item.salePrice || 0), 0)
);

const safeArray = (value) => Array.isArray(value) ? value : [];

const withTimeout = (promise, fallback = [], timeoutMs = 7000) => (
    Promise.race([
        promise.catch(() => fallback),
        new Promise((resolve) => {
            window.setTimeout(() => resolve(fallback), timeoutMs);
        })
    ])
);

function ActionButton({ children, onClick, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="m-0 inline-flex h-9 appearance-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-crm-red/40 bg-crm-red px-3 text-sm font-medium text-white shadow-[0_0_24px_rgba(239,51,41,0.35)] transition-all hover:bg-crm-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg"
        >
            <Plus size={14} />
            {children}
        </button>
    );
}

function StatCard({ icon: Icon, value, label, note, tone = 'neutral' }) {
    const tones = {
        red: 'border-crm-red/40 bg-crm-red/10 text-red-200',
        green: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
        indigo: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-200',
        violet: 'border-purple-500/30 bg-purple-500/5 text-purple-200',
        amber: 'border-amber-500/30 bg-amber-500/5 text-amber-100',
        neutral: 'border-crm-border bg-crm-surface text-crm-fg'
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone] || tones.neutral}`}>
            <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-current/20 bg-black/10">
                    <Icon size={15} className="text-current opacity-80" />
                </span>
            </div>
            <div className="space-y-0.5 text-lg font-bold tabular-nums text-current md:text-2xl">{value}</div>
            <p className="m-0 mt-1 text-[10px] uppercase tracking-wider text-crm-fg-subtle">{label}</p>
            {note && <p className="m-0 mt-0.5 text-xs leading-4 text-crm-fg-muted">{note}</p>}
        </div>
    );
}

function MetricTile({ label, value, note, tone = 'neutral' }) {
    const tones = {
        red: 'border-crm-red/30 bg-crm-red/10 hover:bg-crm-red/15',
        green: 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
        indigo: 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10',
        neutral: 'border-crm-border bg-crm-surface hover:bg-crm-surface-raised'
    };

    return (
        <div className={`flex min-h-[98px] flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${tones[tone] || tones.neutral}`}>
            <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">{label}</p>
            <p className="m-0 text-2xl font-bold tabular-nums text-crm-fg">{value}</p>
            {note && <p className="m-0 text-xs text-crm-fg-subtle">{note}</p>}
        </div>
    );
}

function BalanceCard({ label, value, note, tone = 'neutral' }) {
    const tones = {
        red: 'border-crm-red/30 bg-crm-red/10',
        green: 'border-emerald-500/30 bg-emerald-500/10',
        blue: 'border-blue-500/30 bg-blue-500/10',
        neutral: 'border-crm-border bg-crm-surface'
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone] || tones.neutral}`}>
            <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">{label}</p>
            <p className="m-0 mt-2 text-2xl font-bold tabular-nums text-crm-fg">{value}</p>
            {note && <p className="m-0 mt-1 text-xs text-crm-fg-muted">{note}</p>}
        </div>
    );
}

function PlaceholderPanels() {
    return (
        <div className="space-y-3">
            <div className="min-h-[96px] rounded-xl border border-crm-border bg-crm-surface" />
            <div className="min-h-[96px] rounded-xl border border-crm-border bg-crm-surface" />
        </div>
    );
}

function SectionTitle({ children, meta }) {
    return (
        <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">{children}</h3>
            {meta && <span className="shrink-0 text-xs font-medium text-crm-fg-subtle">{meta}</span>}
        </div>
    );
}

function PanelHeader({ title, subtitle, action }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 className="m-0 text-lg font-bold leading-7 text-crm-fg">{title}</h2>
                {subtitle && <p className="m-0 mt-1 max-w-3xl text-xs leading-4 text-crm-fg-subtle">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function EmptyState({ title, text, actionLabel, onAction }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-crm-border bg-crm-surface px-6 py-12 text-center">
            <div className="space-y-1">
                <h3 className="m-0 text-sm font-semibold text-crm-fg">{title}</h3>
                <p className="m-0 mx-auto max-w-sm text-sm leading-5 text-crm-fg-muted">{text}</p>
            </div>
            {actionLabel && (
                <div className="mt-2">
                    <ActionButton onClick={onAction}>{actionLabel}</ActionButton>
                </div>
            )}
        </div>
    );
}

function ListPanel({ items, renderItem, emptyTitle, emptyText, actionLabel, onEmptyAction }) {
    if (!items.length) {
        return <EmptyState title={emptyTitle} text={emptyText} actionLabel={actionLabel} onAction={onEmptyAction} />;
    }

    return (
        <div className="space-y-2">
            {items.map(renderItem)}
        </div>
    );
}

function stripPersonalMarker(description = '') {
    return Object.values(PERSONAL_MARKERS)
        .reduce((text, marker) => text.replace(marker, ''), description || '')
        .replace(/Monto:\s*([A-Z]{3})\s*0\s*/g, '')
        .trim();
}

function SimpleRow({ keyValue, title, meta, amount }) {
    return (
        <div key={keyValue} className="flex items-center justify-between gap-4 rounded-xl border border-crm-border bg-crm-surface p-4">
            <div className="min-w-0">
                <div className="truncate text-sm font-bold text-crm-fg">{title}</div>
                {meta && <div className="mt-1 text-xs text-crm-fg-subtle">{meta}</div>}
            </div>
            {amount && <div className="shrink-0 text-sm font-black text-crm-fg">{amount}</div>}
        </div>
    );
}

const taskModalConfigs = {
    urgent: {
        marker: PERSONAL_MARKERS.urgent,
        title: 'Nuevo urgente',
        subtitle: 'Anotá un pago o trámite con vencimiento.',
        label: 'Título del urgente',
        placeholder: 'Ej: Pagar seguro del auto',
        submit: 'Guardar urgente',
        type: 'general',
        priority: 'alta'
    },
    debt: {
        marker: PERSONAL_MARKERS.debt,
        title: 'Nueva deuda',
        subtitle: 'Registrá plata que le debés a otra persona.',
        label: 'Nombre de la deuda',
        placeholder: 'Ej: Deuda con proveedor',
        submit: 'Guardar deuda',
        type: 'cobranza',
        priority: 'media'
    },
    fixedExpense: {
        marker: PERSONAL_MARKERS.fixedExpense,
        title: 'Nuevo gasto fijo',
        subtitle: 'Cargá alquiler, servicios, suscripciones o gastos recurrentes.',
        label: 'Nombre del gasto',
        placeholder: 'Ej: Internet oficina',
        submit: 'Guardar gasto fijo',
        type: 'general',
        priority: 'media'
    },
    installmentPay: {
        marker: PERSONAL_MARKERS.installmentPay,
        title: 'Nueva cuota a pagar',
        subtitle: 'Tarjeta, préstamo, hipoteca o pago personal en cuotas.',
        label: 'Nombre de la cuota',
        placeholder: 'Ej: Cuota tarjeta Visa',
        submit: 'Guardar cuota',
        type: 'cobranza',
        priority: 'media'
    },
    installmentCollect: {
        marker: PERSONAL_MARKERS.installmentCollect,
        title: 'Nueva cuota a cobrar',
        subtitle: 'Registrá plata que te tienen que pagar.',
        label: 'Nombre de la cuota',
        placeholder: 'Ej: Préstamo a cobrar',
        submit: 'Guardar cuota',
        type: 'cobranza',
        priority: 'media'
    },
    personalCar: {
        marker: PERSONAL_MARKERS.personalCar,
        title: 'Nuevo auto personal',
        subtitle: 'Separado del stock operativo de la agencia.',
        label: 'Auto personal',
        placeholder: 'Ej: Toyota Hilux personal',
        submit: 'Guardar auto',
        type: 'general',
        priority: 'baja'
    },
    pending: {
        marker: PERSONAL_MARKERS.pending,
        title: 'Nueva tarea',
        subtitle: 'Pendiente personal separado de la operación comercial.',
        label: 'Título de la tarea',
        placeholder: 'Ej: Llamar al contador',
        submit: 'Guardar tarea',
        type: 'general',
        priority: 'media'
    },
    event: {
        marker: PERSONAL_MARKERS.event,
        title: 'Nuevo evento',
        subtitle: 'Evento personal no laboral.',
        label: 'Título del evento',
        placeholder: 'Ej: Turno médico',
        submit: 'Guardar evento',
        type: 'general',
        priority: 'media'
    },
    contact: {
        marker: PERSONAL_MARKERS.contact,
        title: 'Nuevo contacto',
        subtitle: 'Contacto clave personal separado de clientes.',
        label: 'Nombre del contacto',
        placeholder: 'Ej: Contador personal',
        submit: 'Guardar contacto',
        type: 'general',
        priority: 'baja'
    }
};

function PersonalActionModal({ config, isOpen, onClose, onSubmit, saving, error }) {
    const [formData, setFormData] = useState({
        title: '',
        dueDate: TODAY(),
        dueTime: '',
        amount: '',
        currency: 'ARS',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: '',
                dueDate: TODAY(),
                dueTime: '',
                amount: '',
                currency: 'ARS',
                notes: ''
            });
        }
    }, [isOpen, config?.title]);

    if (!isOpen || !config) return null;

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-2xl">
                <div className="flex items-start justify-between border-b border-crm-border p-5">
                    <div>
                        <h2 className="m-0 text-lg font-bold text-crm-fg">{config.title}</h2>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">{config.subtitle}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg">×</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-5">
                    {error && <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-medium text-red-200">{error}</div>}
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">{config.label}</label>
                        <input
                            required
                            value={formData.title}
                            onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                            placeholder={config.placeholder}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-subtle focus:border-crm-red"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Fecha</label>
                            <input
                                required
                                type="date"
                                value={formData.dueDate}
                                onChange={(event) => setFormData({ ...formData, dueDate: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Hora opcional</label>
                            <input
                                type="time"
                                value={formData.dueTime}
                                onChange={(event) => setFormData({ ...formData, dueTime: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Monto opcional</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.amount}
                                onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                                placeholder="0"
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-subtle focus:border-crm-red"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Moneda</label>
                            <select
                                value={formData.currency}
                                onChange={(event) => setFormData({ ...formData, currency: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Notas</label>
                        <textarea
                            rows="4"
                            value={formData.notes}
                            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                            placeholder="Detalles, contexto o recordatorios..."
                            className="w-full resize-none rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-subtle focus:border-crm-red"
                        />
                    </div>
                    <div className="flex justify-end gap-3 border-t border-crm-border pt-4">
                        <button type="button" onClick={onClose} className="rounded-lg border border-crm-border px-4 py-2 text-sm font-medium text-crm-fg hover:bg-crm-surface-raised">Cancelar</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-crm-red px-5 py-2 text-sm font-bold text-white shadow-[0_0_24px_rgba(239,51,41,0.3)] hover:bg-crm-red-hover disabled:opacity-60">
                            {saving ? 'Guardando...' : config.submit}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MoneyActionModal({ isOpen, mode, onClose, onSubmit, saving, error }) {
    const [formData, setFormData] = useState({
        type: 'egreso',
        amount: '',
        currency: 'ARS',
        concept: '',
        category: '',
        paymentMethod: 'efectivo',
        date: TODAY(),
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            const isAgency = mode === 'agency';
            setFormData({
                type: isAgency ? 'egreso' : 'egreso',
                amount: '',
                currency: 'ARS',
                concept: isAgency ? 'Movimiento personal/agencia' : 'Pago manual',
                category: isAgency ? 'Saldo agencia' : 'Pago manual',
                paymentMethod: 'efectivo',
                date: TODAY(),
                notes: ''
            });
        }
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const title = mode === 'agency' ? 'Nuevo movimiento' : 'Registrar pago manual';
    const subtitle = mode === 'agency'
        ? 'Registrá cuando sacás plata de la caja o ponés plata tuya en la agencia.'
        : 'Cargá un pago manual para verlo dentro de Mi Espacio.';

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit({
            ...formData,
            amount: Number(formData.amount || 0),
            notes: `[MI_ESPACIO_MOVIMIENTO]\n${formData.notes || ''}`.trim()
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-surface shadow-2xl">
                <div className="flex items-start justify-between border-b border-crm-border p-5">
                    <div>
                        <h2 className="m-0 text-lg font-bold text-crm-fg">{title}</h2>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">{subtitle}</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg">×</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-5">
                    {error && <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 px-4 py-3 text-sm font-medium text-red-200">{error}</div>}
                    <div className="grid grid-cols-2 gap-2">
                        {['ingreso', 'egreso'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, type })}
                                className={`rounded-xl border px-4 py-3 text-sm font-bold capitalize transition-colors ${formData.type === type ? 'border-crm-red bg-crm-red/15 text-white' : 'border-crm-border bg-crm-bg text-crm-fg-muted hover:bg-crm-surface-raised'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Monto</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.amount}
                                onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Moneda</label>
                            <select
                                value={formData.currency}
                                onChange={(event) => setFormData({ ...formData, currency: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Concepto</label>
                            <input
                                required
                                value={formData.concept}
                                onChange={(event) => setFormData({ ...formData, concept: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Categoría</label>
                            <input
                                required
                                value={formData.category}
                                onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Método</label>
                            <select
                                value={formData.paymentMethod}
                                onChange={(event) => setFormData({ ...formData, paymentMethod: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="cheque">Cheque</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Fecha</label>
                            <input
                                required
                                type="date"
                                value={formData.date}
                                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-crm-fg-muted">Notas</label>
                        <textarea
                            rows="4"
                            value={formData.notes}
                            onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                            className="w-full resize-none rounded-xl border border-crm-border bg-crm-bg px-4 py-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red"
                        />
                    </div>
                    <div className="flex justify-end gap-3 border-t border-crm-border pt-4">
                        <button type="button" onClick={onClose} className="rounded-lg border border-crm-border px-4 py-2 text-sm font-medium text-crm-fg hover:bg-crm-surface-raised">Cancelar</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-crm-red px-5 py-2 text-sm font-bold text-white shadow-[0_0_24px_rgba(239,51,41,0.3)] hover:bg-crm-red-hover disabled:opacity-60">
                            {saving ? 'Guardando...' : 'Registrar movimiento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function MiEspacioPage() {
    const { user } = useAuth();
    const { refresh: fetchCars } = useAdminCars();
    const { fetchTasks, createTask } = useAdminCrmTasks();
    const { fetchInstallments } = useAdminInstallments();
    const { fetchSales } = useAdminSales();
    const { fetchTransactions, createTransaction } = useAdminTransactions();

    const [activeTab, setActiveTab] = useState(TAB_MI_DIA);
    const [loading, setLoading] = useState(true);
    const [includeStock, setIncludeStock] = useState(false);
    const [taskModalKind, setTaskModalKind] = useState(null);
    const [moneyModalMode, setMoneyModalMode] = useState(null);
    const [actionError, setActionError] = useState('');
    const [savingAction, setSavingAction] = useState(false);
    const [data, setData] = useState({
        cars: [],
        tasks: [],
        installments: [],
        sales: [],
        transactions: []
    });

    const refreshMiSpaceData = async () => {
        const [cars, tasks, installments, sales, transactions] = await Promise.all([
            withTimeout(fetchCars()),
            withTimeout(fetchTasks()),
            withTimeout(fetchInstallments()),
            withTimeout(fetchSales()),
            withTimeout(fetchTransactions())
        ]);

        setData({
            cars: safeArray(cars),
            tasks: safeArray(tasks),
            installments: safeArray(installments),
            sales: safeArray(sales),
            transactions: safeArray(transactions)
        });
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                await refreshMiSpaceData();
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const summary = useMemo(() => {
        const now = new Date();
        const pendingTasks = data.tasks.filter((task) => task.status === 'pendiente');
        const overdueTasks = pendingTasks.filter((task) => {
            const date = getDateOnly(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date && date < today;
        });
        const thisMonthSales = data.sales.filter((sale) => (
            isSameMonth(sale.saleDate || sale.createdAt, now) &&
            !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase())
        ));
        const availableStock = data.cars.filter((car) => (
            ['disponible', 'publicado', 'activo'].includes(String(car.status || '').toLowerCase())
        ));
        const activeFiles = data.sales.filter((sale) => (
            !['entregada', 'cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase())
        ));

        const monthInstallments = data.installments.filter((item) => isSameMonth(item.dueDate, now));
        const unpaidInstallments = data.installments.filter((item) => String(item.status || '').toLowerCase() !== 'pagada');
        const monthUnpaidInstallments = monthInstallments.filter((item) => String(item.status || '').toLowerCase() !== 'pagada');
        const paidInstallments = monthInstallments.filter((item) => String(item.status || '').toLowerCase() === 'pagada');
        const toPay = monthUnpaidInstallments.reduce((acc, item) => acc + Number(item.amount || 0) - Number(item.paidAmount || 0), 0);

        const monthTransactions = data.transactions.filter((transaction) => isSameMonth(transaction.date || transaction.createdAt, now));
        const expenseTransactions = monthTransactions.filter((transaction) => ['egreso', 'gasto', 'pago'].includes(String(transaction.type || '').toLowerCase()));
        const incomeTransactions = monthTransactions.filter((transaction) => ['ingreso', 'cobro'].includes(String(transaction.type || '').toLowerCase()));
        const paidThisMonth = sumAmount(expenseTransactions);
        const collectedThisMonth = sumAmount(incomeTransactions);
        const monthIncomeUsd = thisMonthSales
            .filter((sale) => sale.saleCurrency === 'USD')
            .reduce((acc, sale) => acc + Number(sale.salePrice || 0), 0);
        const personalTasks = Object.entries(PERSONAL_MARKERS).reduce((acc, [key, marker]) => {
            acc[key] = data.tasks.filter((task) => String(task.description || '').includes(marker));
            return acc;
        }, {});
        const miSpaceTransactions = data.transactions.filter((transaction) => String(transaction.notes || '').includes('[MI_ESPACIO_MOVIMIENTO]'));
        const manualPayments = miSpaceTransactions.filter((transaction) => String(transaction.category || '').toLowerCase().includes('pago'));
        const agencyTransactions = miSpaceTransactions.filter((transaction) => String(transaction.category || '').toLowerCase().includes('saldo agencia'));

        return {
            pendingTasks,
            overdueTasks,
            urgentTasks: [...overdueTasks, ...pendingTasks.filter((task) => isWithinNext7Days(task.dueDate))],
            todayTasks: pendingTasks.filter((task) => isToday(task.dueDate)),
            next7: pendingTasks.filter((task) => isWithinNext7Days(task.dueDate)),
            availableStock,
            thisMonthSales,
            activeFiles,
            monthInstallments,
            monthUnpaidInstallments,
            unpaidInstallments,
            paidInstallments,
            expenseTransactions,
            incomeTransactions,
            manualPayments,
            agencyTransactions,
            personalTasks,
            toPay,
            toCollect: toPay,
            paidThisMonth,
            collectedThisMonth,
            monthIncomeUsd
        };
    }, [data]);

    const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const role = user?.role === 'admin' ? 'Administrador' : (user?.role || 'Usuario');
    const taskModalConfig = taskModalKind ? taskModalConfigs[taskModalKind] : null;

    const openTaskModal = (kind) => {
        setActionError('');
        setTaskModalKind(kind);
    };

    const openMoneyModal = (mode) => {
        setActionError('');
        setMoneyModalMode(mode);
    };

    const handlePersonalTaskSubmit = async (formData) => {
        if (!taskModalConfig) return;
        setSavingAction(true);
        setActionError('');
        try {
            const amountNote = formData.amount ? `Monto: ${formData.currency} ${formData.amount}` : '';
            const description = [
                taskModalConfig.marker,
                formData.notes,
                amountNote
            ].filter(Boolean).join('\n');

            await createTask({
                title: formData.title,
                description,
                type: taskModalConfig.type,
                priority: taskModalConfig.priority,
                source: 'manual',
                status: 'pendiente',
                dueDate: formData.dueDate,
                dueTime: formData.dueTime || undefined
            });

            await refreshMiSpaceData();
            setTaskModalKind(null);
        } catch (error) {
            setActionError(error.message || 'No se pudo guardar. Revisá la sesión e intentá nuevamente.');
        } finally {
            setSavingAction(false);
        }
    };

    const handleMoneySubmit = async (formData) => {
        setSavingAction(true);
        setActionError('');
        try {
            await createTransaction(formData);
            await refreshMiSpaceData();
            setMoneyModalMode(null);
        } catch (error) {
            setActionError(error.message || 'No se pudo registrar el movimiento. Revisá la sesión e intentá nuevamente.');
        } finally {
            setSavingAction(false);
        }
    };

    const renderPersonalTaskRow = (task) => (
        <SimpleRow
            key={task._id}
            keyValue={task._id}
            title={task.title || 'Item personal'}
            meta={task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-AR') : stripPersonalMarker(task.description)}
            amount={(() => {
                const match = String(task.description || '').match(/Monto:\s*([A-Z]{3})\s*([0-9.]+)/);
                return match ? `${match[1]} ${Number(match[2]).toLocaleString('es-AR')}` : undefined;
            })()}
        />
    );

    const renderMiDia = () => (
        <div className="space-y-6">
            <p className="m-0 mb-5 text-sm text-crm-fg-muted">
                Tu resumen como administrador <span aria-hidden="true">—</span> <strong className="text-crm-fg-muted">{formatMonth(new Date())}</strong>
            </p>

            <section>
                <SectionTitle>Plata este mes</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard icon={CreditCard} value={money(summary.toPay)} label="A pagar este mes" note="Cuotas + deudas que vencen" tone="red" />
                    <StatCard icon={Banknote} value={money(summary.paidThisMonth)} label="Ya pagué este mes" note="Suma de pagos registrados" tone="green" />
                    <StatCard icon={Wallet} value={money(summary.toCollect)} label="A cobrar este mes" note="Cuotas a cobrar que vencen" tone="indigo" />
                    <StatCard icon={Wallet} value={money(summary.collectedThisMonth)} label="Ya cobré este mes" note="Suma de cobros registrados" tone="green" />
                </div>
            </section>

            <section>
                <SectionTitle meta={`${summary.next7.length} eventos`}>Próximos 7 días</SectionTitle>
                <div className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-xs text-crm-fg-subtle">
                    {summary.next7.length === 0 ? (
                        <p className="m-0">Nada que vence en los próximos 7 días. Aprovechá la calma.</p>
                    ) : (
                        <div className="space-y-2">
                            {summary.next7.slice(0, 5).map((task) => (
                                <SimpleRow
                                    key={task._id}
                                    keyValue={task._id}
                                    title={task.title || 'Pendiente'}
                                    meta={task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section>
                <SectionTitle>Tu agencia</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard icon={Car} value={summary.availableStock.length} label="Stock disponible" tone="green" />
                    <StatCard icon={Briefcase} value={summary.thisMonthSales.length} label="Ventas del mes" tone="indigo" />
                    <StatCard icon={Landmark} value={summary.activeFiles.length} label="Expedientes activos" tone="violet" />
                    <StatCard icon={Wallet} value={money(summary.monthIncomeUsd, 'USD')} label="Ingresos del mes" tone="amber" />
                </div>
            </section>

            <section>
                <SectionTitle>Hoy</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatCard icon={CheckCircle2} value={summary.pendingTasks.length} label="Mis pendientes" tone="neutral" />
                    <StatCard icon={CalendarDays} value={summary.todayTasks.length} label="Eventos hoy" tone="neutral" />
                    <StatCard icon={Wallet} value="USD 0" label="Gastos fijos / mes" note="Piso comprometido" tone="indigo" />
                </div>
            </section>
        </div>
    );

    const renderTabPanel = () => {
        if (activeTab === TAB_MI_DIA) return renderMiDia();

        if (activeTab === 'Mis ventas') {
            return (
                <>
                    <PanelHeader title={`Mis ventas — ${summary.thisMonthSales.length} operaciones`} subtitle="Tu actividad comercial del mes en AutoSporting." />
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <StatCard icon={Trophy} value={summary.thisMonthSales.length} label="Ventas del mes" tone="indigo" />
                        <StatCard icon={Wallet} value={money(summary.monthIncomeUsd, 'USD')} label="Ingresos USD" tone="green" />
                        <StatCard icon={Briefcase} value={summary.activeFiles.length} label="Operaciones abiertas" tone="violet" />
                    </section>
                    <ListPanel
                        items={summary.thisMonthSales.slice(0, 8)}
                        emptyTitle="Sin ventas registradas"
                        emptyText="Todavía no hay operaciones asociadas a tu usuario este mes."
                        renderItem={(sale) => (
                            <SimpleRow
                                key={sale._id}
                                keyValue={sale._id}
                                title={`Venta ${String(sale._id || '').slice(-6).toUpperCase()}`}
                                meta={sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                                amount={sale.saleCurrency ? money(sale.salePrice, sale.saleCurrency) : undefined}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'URGENTE') {
            const urgentItems = summary.personalTasks.urgent || [];
            return (
                <>
                    <PanelHeader title={`URGENTE — ${urgentItems.length} pendientes`} subtitle="Tus anotaciones de cosas urgentes a pagar. Cada item muestra cuántos días faltan para el vencimiento." action={<ActionButton onClick={() => openTaskModal('urgent')}>Nuevo urgente</ActionButton>} />
                    <ListPanel
                        items={urgentItems.slice(0, 10)}
                        emptyTitle="Sin items urgentes"
                        emptyText="Anotá acá pagos / trámites con vencimiento para no olvidarlos."
                        actionLabel="Agregar urgente"
                        onEmptyAction={() => openTaskModal('urgent')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Pagos realizados') {
            const payments = summary.manualPayments.length ? summary.manualPayments : summary.expenseTransactions;
            return (
                <>
                    <PanelHeader title={`Pagos realizados — ${payments.length} items`} subtitle="Todos tus pagos en un solo lugar — los manuales + los parciales que cargaste en Deudas, Urgente y Cuotas a pagar." action={<ActionButton onClick={() => openMoneyModal('payment')}>Registrar pago manual</ActionButton>} />
                    <div className="inline-flex rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-crm-fg-muted">Mes: Ver todos</div>
                    <ListPanel
                        items={payments.slice(0, 10)}
                        emptyTitle="Sin pagos registrados"
                        emptyText="Anotá un pago manual acá, o cargá un pago parcial en Deudas/Urgente/Cuotas a pagar y va a aparecer en esta lista."
                        actionLabel="Registrar pago manual"
                        onEmptyAction={() => openMoneyModal('payment')}
                        renderItem={(tx) => (
                            <SimpleRow
                                key={tx._id}
                                keyValue={tx._id}
                                title={tx.concept || tx.description || 'Pago'}
                                meta={tx.date ? new Date(tx.date).toLocaleDateString('es-AR') : tx.category || 'Movimiento'}
                                amount={money(tx.amount, tx.currency)}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Deudas') {
            const debtItems = summary.personalTasks.debt || [];
            return (
                <>
                    <PanelHeader title={`Deudas — ${debtItems.length} activas`} subtitle="Plata que le debés a otras personas. Solo vos lo ves." action={<ActionButton onClick={() => openTaskModal('debt')}>Nueva deuda</ActionButton>} />
                    <ListPanel
                        items={debtItems.slice(0, 10)}
                        emptyTitle="Sin deudas registradas"
                        emptyText="Si le debés plata a alguien, anotalo acá para no perderle la huella."
                        actionLabel="Nueva deuda"
                        onEmptyAction={() => openTaskModal('debt')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Gastos fijos') {
            const fixedItems = summary.personalTasks.fixedExpense || [];
            return (
                <>
                    <PanelHeader title={`Gastos fijos / Suscripciones — ${fixedItems.length} ítems`} action={<ActionButton onClick={() => openTaskModal('fixedExpense')}>Nuevo gasto fijo</ActionButton>} />
                    <ListPanel
                        items={fixedItems}
                        emptyTitle="Sin gastos fijos"
                        emptyText="Cargá tus gastos fijos: alquiler, prepaga, internet, ABL, sueldos, suscripciones, etc."
                        onEmptyAction={() => openTaskModal('fixedExpense')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Cuotas a pagar') {
            const payItems = summary.personalTasks.installmentPay || [];
            const overdue = payItems.filter((item) => {
                const date = getDateOnly(item.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date && date < today;
            });
            const totalDebt = payItems.reduce((acc, item) => {
                const match = String(item.description || '').match(/Monto:\s*([A-Z]{3})\s*([0-9.]+)/);
                return acc + (match ? Number(match[2]) : 0);
            }, 0);

            return (
                <>
                    <PanelHeader
                        title={`Cuotas a pagar — ${payItems.length} pendientes`}
                        subtitle="Tarjeta, hipoteca, préstamos — todo lo que pagás en cuotas."
                        action={(
                            <div className="flex flex-wrap gap-2">
                                <ActionButton onClick={() => openTaskModal('installmentPay')}>Nueva cuota</ActionButton>
                                <ActionButton onClick={() => openTaskModal('installmentPay')}>Plan automático</ActionButton>
                            </div>
                        )}
                    />
                    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile label="Vencidas" value={overdue.length} note={overdue.length === 0 ? 'Al día ✓' : 'Revisar vencidas'} tone="red" />
                        <MetricTile label="Vence este mes" value={payItems.filter((item) => isSameMonth(item.dueDate, new Date())).length} note={payItems.length === 0 ? 'Sin vencimientos' : 'Pendientes del mes'} tone="indigo" />
                        <MetricTile label="Pagado este mes" value="USD 0" tone="green" />
                        <MetricTile label="Total adeudado" value={totalDebt > 0 ? money(totalDebt) : 'Sin deudas'} tone="neutral" />
                    </section>
                    <ListPanel
                        items={payItems.slice(0, 10)}
                        emptyTitle="Sin cuotas registradas"
                        emptyText="Cargá tus deudas: tarjeta de crédito, hipoteca, préstamo, leasing, viaje en cuotas..."
                        onEmptyAction={() => openTaskModal('installmentPay')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Cuotas a cobrar') {
            const collectItems = summary.personalTasks.installmentCollect || [];
            return (
                <>
                    <PanelHeader
                        title={`Cuotas a cobrar — ${collectItems.length} pendientes`}
                        subtitle="Plata que te tienen que pagar — préstamos personales, fiados, etc. Solo vos lo ves."
                        action={(
                            <div className="flex flex-wrap gap-2">
                                <ActionButton onClick={() => openTaskModal('installmentCollect')}>Nueva cuota</ActionButton>
                                <ActionButton onClick={() => openTaskModal('installmentCollect')}>Plan automático</ActionButton>
                            </div>
                        )}
                    />
                    <ListPanel
                        items={collectItems.slice(0, 10)}
                        emptyTitle="Sin cuotas a cobrar"
                        emptyText="Anotá la plata que te deben — préstamos a amigos, fiados, ventas en cuotas privadas..."
                        onEmptyAction={() => openTaskModal('installmentCollect')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Saldo agencia') {
            return (
                <>
                    <PanelHeader title={`Préstamos cruzados con la agencia — ${summary.agencyTransactions.length} sin saldar`} subtitle="Registrá cuando sacás plata de la caja para uso personal o cuando ponés tuya en la agencia." action={<ActionButton onClick={() => openMoneyModal('agency')}>Nuevo movimiento</ActionButton>} />
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <BalanceCard label="Agencia me debe" value="USD 0" note="$ 0" tone="green" />
                        <BalanceCard label="Yo debo a agencia" value="USD 0" note="$ 0" tone="red" />
                        <BalanceCard label="Neto" value="USD 0" note="A favor mío · $ 0 A favor mío" tone="blue" />
                    </section>
                    <ListPanel
                        items={summary.agencyTransactions}
                        emptyTitle="Sin movimientos"
                        emptyText="Registrá cuando sacás plata de la caja para gastos personales o cuando ponés tuya a la agencia."
                        onEmptyAction={() => openMoneyModal('agency')}
                        renderItem={(tx) => (
                            <SimpleRow
                                key={tx._id}
                                keyValue={tx._id}
                                title={tx.concept || 'Movimiento agencia'}
                                meta={tx.date ? new Date(tx.date).toLocaleDateString('es-AR') : tx.category || 'Saldo agencia'}
                                amount={money(tx.amount, tx.currency)}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Mis autos') {
            const personalCars = summary.personalTasks.personalCar || [];
            return (
                <>
                    <PanelHeader title={`Mis autos personales — ${personalCars.length} registrados`} action={<ActionButton onClick={() => openTaskModal('personalCar')}>Nuevo auto personal</ActionButton>} />
                    {personalCars.length > 0 ? (
                        <ListPanel
                            items={personalCars}
                            emptyTitle="Sin autos personales"
                            emptyText="Cargá tus autos personales para separarlos del stock comercial."
                            onEmptyAction={() => openTaskModal('personalCar')}
                            renderItem={renderPersonalTaskRow}
                        />
                    ) : (
                        <PlaceholderPanels />
                    )}
                </>
            );
        }

        if (activeTab === 'Patrimonio') {
            return (
                <>
                    <PanelHeader title={`Resumen patrimonial — ${displayName}`} subtitle="Vista consolidada de activos y pasivos personales. Cada moneda se calcula por separado — el tipo de cambio es volátil." />
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-medium text-crm-fg-muted">
                        <input
                            type="checkbox"
                            checked={includeStock}
                            onChange={(event) => setIncludeStock(event.target.checked)}
                            className="h-4 w-4 rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                        />
                        Incluir stock propio (USD)
                    </label>
                    <PlaceholderPanels />
                </>
            );
        }

        if (activeTab === 'Pendientes') {
            const personalPending = summary.personalTasks.pending || [];
            return (
                <>
                    <PanelHeader title={`Mis pendientes — ${personalPending.length} sin completar`} action={<ActionButton onClick={() => openTaskModal('pending')}>Nueva tarea</ActionButton>} />
                    <ListPanel
                        items={personalPending.slice(0, 12)}
                        emptyTitle="Sin pendientes"
                        emptyText="Cargá tus tareas: llamar al contador, renovar registro, ver médico, comprar regalo cumple..."
                        onEmptyAction={() => openTaskModal('pending')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Calendario') {
            const personalEvents = summary.personalTasks.event || [];
            return (
                <>
                    <PanelHeader title={`Mi calendario personal — ${personalEvents.length} eventos`} subtitle="Eventos no laborales: cumpleaños familia, médico, vacaciones, eventos de los chicos…" action={<ActionButton onClick={() => openTaskModal('event')}>Nuevo evento</ActionButton>} />
                    <ListPanel
                        items={personalEvents.slice(0, 10)}
                        emptyTitle="Sin eventos personales"
                        emptyText="Cargá cumpleaños, vacaciones, turnos médicos, eventos de los chicos…"
                        onEmptyAction={() => openTaskModal('event')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        if (activeTab === 'Contactos') {
            const contacts = summary.personalTasks.contact || [];
            return (
                <>
                    <PanelHeader title={`Mis contactos clave — ${contacts.length} registrados`} subtitle="Tu agenda personal — separada de los clientes de la agencia." action={<ActionButton onClick={() => openTaskModal('contact')}>Nuevo contacto</ActionButton>} />
                    <ListPanel
                        items={contacts}
                        emptyTitle="Sin contactos"
                        emptyText="Cargá contactos importantes: contador, abogado, escribano, mecánico, gerente del banco..."
                        onEmptyAction={() => openTaskModal('contact')}
                        renderItem={renderPersonalTaskRow}
                    />
                </>
            );
        }

        return renderMiDia();
    };

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-crm-fg-subtle">
                Cargando mi espacio...
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-24 font-sans text-crm-fg animate-in fade-in duration-300 md:p-6">
            <header className="mb-5 border-b border-crm-border pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="m-0 text-xl font-semibold leading-7 text-crm-fg">Mi Espacio — {displayName}</h1>
                        <p className="m-0 mt-0.5 text-sm text-crm-fg-muted">
                            Tu zona personal — separada de la operación de la agencia. Solo vos ves esto.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200">
                        {role}
                    </span>
                </div>
            </header>

            <nav className="mt-6 mb-4 overflow-x-auto rounded-xl border border-crm-border bg-crm-surface p-1" aria-label="Pestañas de Mi Espacio">
                <div className="flex min-w-max gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.label;
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => setActiveTab(tab.label)}
                                className={`m-0 inline-flex shrink-0 appearance-none items-center gap-1.5 whitespace-nowrap rounded-lg border-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                                    active
                                        ? 'bg-crm-red text-white shadow'
                                        : 'bg-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg'
                                }`}
                                aria-pressed={active}
                                title={tab.label}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <section className={activeTab === TAB_MI_DIA ? '' : 'space-y-4'}>
                {renderTabPanel()}
            </section>

            <PersonalActionModal
                config={taskModalConfig}
                isOpen={Boolean(taskModalKind)}
                onClose={() => {
                    setTaskModalKind(null);
                    setActionError('');
                }}
                onSubmit={handlePersonalTaskSubmit}
                saving={savingAction}
                error={actionError}
            />

            <MoneyActionModal
                isOpen={Boolean(moneyModalMode)}
                mode={moneyModalMode}
                onClose={() => {
                    setMoneyModalMode(null);
                    setActionError('');
                }}
                onSubmit={handleMoneySubmit}
                saving={savingAction}
                error={actionError}
            />
        </div>
    );
}
