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
    Layers
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

    // Paso 2: Presupuestos y Metas
    const [monthlyPersonalBudgetARS, setMonthlyPersonalBudgetARS] = useState(config.monthlyPersonalBudgetARS || 4500000);
    const [reserveMonthsTarget, setReserveMonthsTarget] = useState(config.reserveMonthsTarget || 3);
    const [postventaPerVehicleARS, setPostventaPerVehicleARS] = useState(config.postventaPerVehicleARS || 250000);
    const [operationalHorizonDays, setOperationalHorizonDays] = useState(config.operationalHorizonDays || 30);

    // Paso 3: Prioridades de distribución
    const [priorityOrder, setPriorityOrder] = useState(
        config.priorityOrder || ['operativa', 'impuestos', 'personal', 'deudas', 'postventa', 'reserva', 'stock', 'crecimiento']
    );

    // Paso 4: Reglas de gastos
    const [rules, setRules] = useState(() => {
        if (categoryRules && categoryRules.length > 0) return categoryRules;
        return [
            { category: 'Alquiler', boxKey: 'operativa' },
            { category: 'Servicios', boxKey: 'operativa' },
            { category: 'Mantenimiento', boxKey: 'operativa' },
            { category: 'Sueldos', boxKey: 'personal' },
            { category: 'Comisiones Ventas', boxKey: 'personal' },
            { category: 'Impuestos', boxKey: 'impuestos' },
            { category: 'Préstamos y Deudas', boxKey: 'deudas' },
            { category: 'Mecánica Postventa', boxKey: 'postventa' }
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

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Guardar Configuración de Parámetros
            const configRes = await fetch('/api/admin/tesoreria-estrategica/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    operationalHorizonDays: Number(operationalHorizonDays),
                    reserveMonthsTarget: Number(reserveMonthsTarget),
                    monthlyPersonalBudgetARS: Number(monthlyPersonalBudgetARS),
                    postventaPerVehicleARS: Number(postventaPerVehicleARS),
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
                toast.success('Configuración inicial guardada con éxito.');
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
                                <h3 className="text-base font-black text-white">Asistente de Configuración Inicial</h3>
                                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                    Paso {currentStep} de 4
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Configura una sola vez las reglas, presupuestos y prioridades para operar automáticamente.
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
                        1. Corte Inicial
                    </div>
                    <div className={`pb-1 border-b-2 ${currentStep === 2 ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted'}`}>
                        2. Presupuestos
                    </div>
                    <div className={`pb-1 border-b-2 ${currentStep === 3 ? 'border-purple-500 text-purple-300' : 'border-transparent text-crm-fg-muted'}`}>
                        3. Prioridades
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

                    {/* PASO 2: PRESUPUESTOS Y METAS */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 text-xs text-crm-fg-muted">
                                Define tus previsiones mensuales para que el sistema calcule automáticamente las metas requeridas de cada caja.
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Presupuesto Mensual de Personal (ARS)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={monthlyPersonalBudgetARS}
                                        onChange={(e) => setMonthlyPersonalBudgetARS(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">Sueldos, cargas fijas y adelantos mensuales.</span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Meses de Reserva (Meses Lentos)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={reserveMonthsTarget}
                                        onChange={(e) => setReserveMonthsTarget(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">Meses de gastos fijos a proteger en la caja Reserva.</span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Provisión de Postventa por Auto Vendido (ARS)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={postventaPerVehicleARS}
                                        onChange={(e) => setPostventaPerVehicleARS(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:outline-none"
                                    />
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">Fondo preventivo para atender garantías de entregas.</span>
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
                                    <span className="text-[10px] text-crm-fg-muted mt-0.5 block">Días de anticipación para gastos operativos próximos.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: PRIORIDADES DE DISTRIBUCIÓN */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 text-xs text-crm-fg-muted">
                                Cuando ingresa un cobro neto, el sistema lo reparte cubriendo primero los faltantes de las cajas con mayor prioridad.
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
                                            {idx < 2 ? 'Prioridad Crítica' : idx < 5 ? 'Obligaciones' : 'Reserva y Stock'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PASO 4: REGLAS DE GASTOS */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 text-xs text-crm-fg-muted">
                                Al registrar un gasto en Finanzas, se descontará automáticamente de la caja vinculada aquí, comprometiendo fondos mientras esté pendiente y debitando al pagarse.
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
                                            <option value="operativa">Caja Operativa</option>
                                            <option value="personal">Caja Personal</option>
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
