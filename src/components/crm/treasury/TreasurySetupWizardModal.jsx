"use client";

import React, { useState } from 'react';
import {
    Sparkles,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    SlidersHorizontal,
    Landmark,
    Briefcase,
    ShieldCheck,
    User,
    X,
    Scale,
    Layers,
    DollarSign,
    Car,
    TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasurySetupWizardModal({
    isOpen,
    onClose,
    summary = {},
    accounts = [],
    config = {},
    categoryRules = [],
    treasuryToken,
    onSuccess
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [currentStep, setCurrentStep] = useState(1); // 1 | 2 | 3 | 4

    // Paso 1: Confirmación de Corte Inicial
    const [cutoffDate, setCutoffDate] = useState(todayStr);
    const [cutoffReason, setCutoffReason] = useState('Confirmación de corte inicial sobre saldo real');

    // Paso 2: Presupuestos y Metas (sin montos de ejemplo fijos en producción)
    const [personalMonthlyBudgetARS, setPersonalMonthlyBudgetARS] = useState(
        config.personalMonthlyBudgetARS ?? config.monthlyPersonalBudgetARS ?? 0
    );
    const [reserveMonths, setReserveMonths] = useState(
        config.reserveMonths ?? config.reserveMonthsTarget ?? 2
    );
    const [postventaProvisionPerVehicleARS, setPostventaProvisionPerVehicleARS] = useState(
        config.postventaProvisionPerVehicleARS ?? config.postventaPerVehicleARS ?? 0
    );
    const [operationalHorizonDays, setOperationalHorizonDays] = useState(
        config.operationalHorizonDays ?? 30
    );

    // Regla de Excedente (Surplus Rule) y Automatización
    const [surplusConfigured, setSurplusConfigured] = useState(
        Boolean(config.surplusRule?.configured)
    );
    const [surplusStockPercent, setSurplusStockPercent] = useState(
        config.surplusRule?.stockPercent ?? 0
    );
    const [surplusCrecimientoPercent, setSurplusCrecimientoPercent] = useState(
        config.surplusRule?.crecimientoPercent ?? 0
    );
    const [autoDistributeIncomes, setAutoDistributeIncomes] = useState(
        Boolean(config.autoDistributeIncomes)
    );

    // Paso 3: Prioridades de distribución
    const [priorityOrder, setPriorityOrder] = useState(
        Array.isArray(config.priorityOrder) && config.priorityOrder.length > 0
            ? config.priorityOrder
            : ['operativa', 'personal', 'impuestos', 'deudas', 'postventa', 'reserva', 'stock', 'crecimiento']
    );

    // Paso 4: Reglas de gastos (Sueldos y comisiones van a OPERATIVA; retiros a PERSONAL)
    const [rules, setRules] = useState(() => {
        if (categoryRules && categoryRules.length > 0) {
            // Asegurar que si Sueldos o Comisiones estaban en personal, se corrijan a operativa
            return categoryRules.map(r => {
                const catLower = (r.category || '').toLowerCase();
                if ((catLower === 'sueldos' || catLower === 'comisiones' || catLower === 'comisiones ventas') && r.boxKey === 'personal') {
                    return { ...r, boxKey: 'operativa' };
                }
                return r;
            });
        }
        return [
            { category: 'Alquiler', boxKey: 'operativa' },
            { category: 'Servicios', boxKey: 'operativa' },
            { category: 'Mantenimiento', boxKey: 'operativa' },
            { category: 'Sueldos', boxKey: 'operativa' },
            { category: 'Comisiones Ventas', boxKey: 'operativa' },
            { category: 'Publicidad', boxKey: 'operativa' },
            { category: 'Impuestos', boxKey: 'impuestos' },
            { category: 'AFIP/IVA', boxKey: 'impuestos' },
            { category: 'Préstamos y Deudas', boxKey: 'deudas' },
            { category: 'Mecánica Postventa', boxKey: 'postventa' },
            { category: 'Gastos Personales', boxKey: 'personal' },
            { category: 'Retiros', boxKey: 'personal' }
        ];
    });

    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleRuleChange = (index, field, value) => {
        setRules(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleStockPercentChange = (val) => {
        const stockVal = Math.min(100, Math.max(0, Number(val) || 0));
        setSurplusStockPercent(stockVal);
        setSurplusCrecimientoPercent(100 - stockVal);
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Guardar Configuración de Parámetros sincronizada
            const configRes = await fetch('/api/admin/tesoreria-estrategica/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    operationalHorizonDays: Number(operationalHorizonDays),
                    reserveMonths: Number(reserveMonths),
                    reserveMonthsTarget: Number(reserveMonths),
                    personalMonthlyBudgetARS: Number(personalMonthlyBudgetARS),
                    monthlyPersonalBudgetARS: Number(personalMonthlyBudgetARS),
                    postventaProvisionPerVehicleARS: Number(postventaProvisionPerVehicleARS),
                    postventaPerVehicleARS: Number(postventaProvisionPerVehicleARS),
                    autoDistributeIncomes: Boolean(autoDistributeIncomes),
                    surplusRule: {
                        configured: Boolean(surplusConfigured),
                        stockPercent: Number(surplusStockPercent),
                        crecimientoPercent: Number(surplusCrecimientoPercent)
                    },
                    priorityOrder
                })
            });

            // 2. Confirmar Corte Inicial
            const cutoffRes = await fetch('/api/admin/tesoreria-estrategica/confirm-initial-cutoff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    cutoffDate,
                    reason: cutoffReason
                })
            });

            // 3. Guardar Reglas de Categorías
            await fetch('/api/admin/tesoreria-estrategica/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({ rules })
            });

            if (configRes.ok && cutoffRes.ok) {
                toast.success('Configuración de tesorería y reglas guardadas con éxito.');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                toast.error('Se guardó parte de la configuración, revise auditoría.');
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch {
            toast.error('Error al guardar la configuración inicial.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-purple-500/30 bg-crm-surface shadow-2xl overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                            <Sparkles size={20} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white">Asistente de Configuración de Tesorería</h3>
                                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                    Paso {currentStep} de 4
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Configura las reglas, presupuestos y destinos para que el sistema sugiera repartos basados en datos reales.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-crm-fg-muted hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Stepper Superior */}
                <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-crm-border bg-crm-bg/50 shrink-0 text-xs font-bold text-center">
                    <div className={`pb-1 border-b-2 ${currentStep === 1 ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted'}`}>
                        1. Corte Inicial y Saldos
                    </div>
                    <div className={`pb-1 border-b-2 ${currentStep === 2 ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted'}`}>
                        2. Presupuestos y Reserva
                    </div>
                    <div className={`pb-1 border-b-2 ${currentStep === 3 ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted'}`}>
                        3. Prioridades y Excedente
                    </div>
                    <div className={`pb-1 border-b-2 ${currentStep === 4 ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted'}`}>
                        4. Gastos a Cajas
                    </div>
                </div>

                {/* Contenido por Paso */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* PASO 1: CORTE INICIAL */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-xs text-purple-200">
                                <p className="font-bold text-white mb-1">Confirmación de Saldo Real Actual</p>
                                <p className="leading-relaxed">
                                    El corte inicial fija el punto de partida en el tiempo. Todas las operaciones y cuotas cobradas antes de esta fecha ya están reflejadas en el saldo confirmado de tus cuentas bancarias y de efectivo.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-crm-border bg-crm-bg/70 p-4 space-y-2">
                                <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">
                                    Saldos Actuales en Cuentas del CRM
                                </span>
                                <div className="flex flex-wrap items-center gap-4 text-sm font-mono font-black text-white">
                                    <div>ARS: <span className="text-purple-300">{formatMoney(summary.totalCuentasARS, 'ARS')}</span></div>
                                    <div>USD: <span className="text-emerald-400">{formatMoney(summary.totalCuentasUSD, 'USD')}</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Fecha de Corte Inicial
                                    </label>
                                    <input
                                        type="date"
                                        value={cutoffDate}
                                        onChange={(e) => setCutoffDate(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Motivo del Corte
                                    </label>
                                    <input
                                        type="text"
                                        value={cutoffReason}
                                        onChange={(e) => setCutoffReason(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 2: PRESUPUESTOS, RESERVA Y PROVISIÓN DE POSTVENTA */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 text-xs text-crm-fg-muted">
                                Define tus previsiones y metas mensuales para que el sistema calcule los importes sugeridos sin recurrir a valores fijos ni porcentajes inventados.
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Retiros Mensuales del Propietario (ARS)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={personalMonthlyBudgetARS}
                                        onChange={(e) => setPersonalMonthlyBudgetARS(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-purple-300 mt-0.5 block">
                                        Exclusivamente retiros del titular. Los sueldos y comisiones del personal van a Operativa.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Meses de Reserva de Liquidez
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={reserveMonths}
                                        onChange={(e) => setReserveMonths(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">
                                        Meses de estructura operativa fija a proteger en la caja Reserva para meses lentos.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Provisión de Postventa por Auto Vendido (ARS)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={postventaProvisionPerVehicleARS}
                                        onChange={(e) => setPostventaProvisionPerVehicleARS(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">
                                        Garantía por unidad entregada (últimos 90 días). No se multiplica por cuotas.
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Horizonte Operativo Inmediato (Días)
                                    </label>
                                    <input
                                        type="number"
                                        min="7"
                                        max="90"
                                        value={operationalHorizonDays}
                                        onChange={(e) => setOperationalHorizonDays(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">
                                        Días de anticipación para gastos operativos y compromisos a cubrir en Operativa.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: PRIORIDADES DE DISTRIBUCIÓN Y REGLA DE EXCEDENTE */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 text-xs text-crm-fg-muted">
                                Ante fondos limitados, el reparto cubre primero los faltantes de las cajas con mayor prioridad antes de pasar a la siguiente.
                            </div>

                            <div className="space-y-2">
                                {priorityOrder.map((key, idx) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg/80 px-3.5 py-2 text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 font-bold text-purple-300 text-[11px]">
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                                                Caja {key}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-crm-fg-muted">
                                            {idx < 2 ? 'Prioridad Crítica' : idx < 4 ? 'Obligaciones y Personal' : idx < 6 ? 'Provisión y Reserva' : 'Excedente'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Configuración de Regla de Excedente (Surplus Rule) */}
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/80 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold text-white">Regla de Distribución de Excedente</h4>
                                        <p className="text-[11px] text-crm-fg-muted">
                                            ¿Qué hacer con la liquidez que sobra después de cubrir el 100% de las cajas prioritarias?
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={surplusConfigured}
                                            onChange={(e) => setSurplusConfigured(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-crm-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                {surplusConfigured ? (
                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-crm-border/40 text-xs">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-cyan-400 mb-1">
                                                % Excedente a Stock / Compras
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={surplusStockPercent}
                                                onChange={(e) => handleStockPercentChange(e.target.value)}
                                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2 font-mono text-xs font-bold text-white focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-emerald-400 mb-1">
                                                % Excedente a Fondo de Crecimiento
                                            </label>
                                            <input
                                                type="number"
                                                disabled
                                                value={surplusCrecimientoPercent}
                                                className="w-full rounded-xl border border-crm-border bg-crm-bg/50 p-2 font-mono text-xs font-bold text-emerald-400 focus:outline-none opacity-80"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-crm-fg-muted rounded-xl bg-crm-surface p-2.5 border border-crm-border/40">
                                        ℹ️ Al no configurar una regla, todo excedente permanecerá <strong>sin asignar en cuentas</strong>, sin inflar artificialmente las cajas de Stock ni Crecimiento.
                                    </div>
                                )}
                            </div>

                            {/* Opción de Distribución Automática */}
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/80 p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-white">Distribución Automática de Cobros</h4>
                                    <p className="text-[11px] text-crm-fg-muted">
                                        Si se activa, cada nuevo cobro confirmado se distribuirá automáticamente según estas prioridades.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoDistributeIncomes}
                                        onChange={(e) => setAutoDistributeIncomes(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-crm-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* PASO 4: REGLAS DE GASTOS */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 text-xs text-crm-fg-muted">
                                Al registrar un gasto en Finanzas, se descontará automáticamente de la caja vinculada aquí. Sueldos y comisiones corresponden a Operativa; gastos personales y retiros a Personal.
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {rules.map((rule, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-2 gap-2 rounded-xl border border-crm-border bg-crm-bg/80 p-2.5 text-xs"
                                    >
                                        <input
                                            type="text"
                                            value={rule.category}
                                            onChange={(e) => handleRuleChange(idx, 'category', e.target.value)}
                                            placeholder="Categoría"
                                            className="rounded-lg border border-crm-border bg-crm-surface px-2.5 py-1 text-white font-bold text-xs focus:outline-none"
                                        />
                                        <select
                                            value={rule.boxKey}
                                            onChange={(e) => handleRuleChange(idx, 'boxKey', e.target.value)}
                                            className="rounded-lg border border-crm-border bg-crm-surface px-2.5 py-1 text-white text-xs focus:outline-none"
                                        >
                                            <option value="operativa">Caja Operativa (incluye sueldos/comisiones)</option>
                                            <option value="personal">Caja Personal (retiros titular)</option>
                                            <option value="impuestos">Impuestos</option>
                                            <option value="deudas">Deudas</option>
                                            <option value="postventa">Postventa</option>
                                            <option value="reserva">Reserva</option>
                                            <option value="stock">Stock</option>
                                            <option value="crecimiento">Crecimiento</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pie con Navegación Anterior / Siguiente / Guardar */}
                <div className="p-4 border-t border-crm-border bg-crm-surface/90 shrink-0 flex items-center justify-between">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        >
                            <ArrowLeft size={14} /> Anterior
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2">
                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(prev => prev + 1)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                            >
                                Siguiente <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleSaveAll}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-600/20"
                            >
                                <CheckCircle2 size={16} />
                                {isSaving ? 'Guardando configuración...' : 'Guardar y Activar Automatización'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
