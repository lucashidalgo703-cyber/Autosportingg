"use client";

import React, { useState } from 'react';
import {
    Calendar,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Trash2,
    ArrowRight,
    Scale,
    Info,
    HelpCircle,
    X,
    FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasuryReconciliationModal({
    isOpen,
    onClose,
    accounts = [],
    pendingInstallments = [],
    pendingCollections = {},
    treasuryToken,
    onReconciliationSuccess
}) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Paso 1: Carga de saldos reales | Paso 2: Revisión de diferencias | Paso 3: Confirmación
    const [step, setStep] = useState(1);
    const [cutoffDate, setCutoffDate] = useState(todayStr);
    const [reason, setReason] = useState('Conciliación inicial de saldos reales');
    const [notes, setNotes] = useState('');

    // Estado editable de saldos reales por cuenta
    const [realBalances, setRealBalances] = useState(() => {
        const initial = {};
        accounts.forEach(acc => {
            initial[acc._id] = acc.balance ?? 0;
        });
        return initial;
    });

    // Cuentas nuevas agregadas en el momento
    const [newAccounts, setNewAccounts] = useState([]);
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountForm, setNewAccountForm] = useState({
        name: '',
        type: 'Efectivo',
        currency: 'USD',
        balance: 0
    });

    // Cuotas históricas seleccionadas para regularización
    const [selectedInstallmentIds, setSelectedInstallmentIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleBalanceChange = (accId, val) => {
        const num = parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
        setRealBalances(prev => ({ ...prev, [accId]: num }));
    };

    const handleAddAccount = () => {
        if (!newAccountForm.name.trim()) {
            toast.error('Ingresá el nombre de la cuenta');
            return;
        }
        setNewAccounts(prev => [
            ...prev,
            {
                tempId: `temp_${Date.now()}`,
                name: newAccountForm.name.trim(),
                type: newAccountForm.type,
                currency: newAccountForm.currency,
                realBalance: Number(newAccountForm.balance) || 0,
                previousBalance: 0
            }
        ]);
        setNewAccountForm({ name: '', type: 'Efectivo', currency: 'USD', balance: 0 });
        setIsAddingAccount(false);
        toast.success('Cuenta agregada al asistente');
    };

    const handleToggleInstallment = (id) => {
        setSelectedInstallmentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Cálculos de totales y diferencias
    const combinedAccounts = [
        ...accounts.map(acc => {
            const real = realBalances[acc._id] !== undefined ? realBalances[acc._id] : (acc.balance || 0);
            const prev = acc.balance || 0;
            return {
                accountId: acc._id,
                name: acc.name,
                type: acc.type,
                currency: acc.currency,
                previousBalance: prev,
                realBalance: real,
                difference: real - prev
            };
        }),
        ...newAccounts.map(na => ({
            name: na.name,
            type: na.type,
            currency: na.currency,
            previousBalance: 0,
            realBalance: na.realBalance,
            difference: na.realBalance,
            isNew: true
        }))
    ];

    const totalRealUSD = combinedAccounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.realBalance, 0);
    const totalPrevUSD = combinedAccounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.previousBalance, 0);
    const diffUSD = totalRealUSD - totalPrevUSD;

    const totalRealARS = combinedAccounts.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.realBalance, 0);
    const totalPrevARS = combinedAccounts.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.previousBalance, 0);
    const diffARS = totalRealARS - totalPrevARS;

    const adjustedAccountsCount = combinedAccounts.filter(a => Math.abs(a.difference) > 0.001).length;

    const handleConfirmSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                cutoffDate,
                reason,
                notes,
                accountsData: combinedAccounts.map(a => ({
                    accountId: a.accountId,
                    name: a.name,
                    type: a.type,
                    currency: a.currency,
                    realBalance: a.realBalance
                })),
                regularizeInstallmentIds: selectedInstallmentIds
            };

            const res = await fetch('/api/admin/tesoreria-estrategica/reconcile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al aplicar conciliación');
                return;
            }

            toast.success('Conciliación confirmada y aplicada con éxito');
            if (onReconciliationSuccess) onReconciliationSuccess();
            onClose();
        } catch {
            toast.error('Error de red al aplicar la conciliación.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
            <div className="my-8 w-full max-w-4xl rounded-3xl border border-purple-500/30 bg-crm-surface p-6 sm:p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between pb-5 border-b border-crm-border">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-300">
                            <Scale size={22} />
                        </span>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                                Dirección de Finanzas · Conciliación de Caja
                            </span>
                            <h2 className="text-xl font-black text-white">
                                Asistente de Conciliación y Saldo Inicial
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Banner de Referencia de Liquidez (USD 5.000 y Tracker) */}
                <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-amber-200">
                                    Referencia de liquidez indicada: USD 5.000
                                </span>
                                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                                    Referencia operativa
                                </span>
                            </div>
                            <p className="text-amber-100/80 leading-relaxed">
                                Este monto no se registra de forma automática ni se asume en efectivo físico. Por favor confirmá cómo se distribuye esta liquidez entre tus cuentas reales (efectivo, bancos o billeteras) y la fecha de corte.
                            </p>
                            <p className="text-amber-200/90 font-medium pt-1 border-t border-amber-500/20">
                                🚗 <strong>Chevrolet Tracker Premier:</strong> Los fondos pendientes de cobro no forman parte de la liquidez de caja hasta que se acrediten efectivamente.
                            </p>
                        </div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="mt-6 space-y-6">
                        {/* Selector de Fecha de Corte y Motivo */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-purple-400" />
                                    Fecha de Corte
                                </label>
                                <input
                                    type="date"
                                    value={cutoffDate}
                                    onChange={(e) => setCutoffDate(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg p-3 text-sm font-semibold text-white focus:border-purple-500 focus:outline-none"
                                />
                                <span className="text-[11px] text-crm-fg-muted mt-1 block">
                                    Los saldos declarados corresponden al cierre de esta fecha.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                                    Motivo del Ajuste
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Ej: Conciliación inicial de saldos reales"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
                                />
                                <span className="text-[11px] text-crm-fg-muted mt-1 block">
                                    Se registrará en auditoría y no se computará como venta ni facturación.
                                </span>
                            </div>
                        </div>

                        {/* Tabla de Cuentas y Saldos Reales */}
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-wider text-crm-fg">
                                    Saldos Reales por Cuenta (Efectivo, Bancos y Billeteras)
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingAccount(true)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-300 hover:text-purple-200 transition-colors"
                                >
                                    <Plus size={14} /> Agregar otra cuenta real
                                </button>
                            </div>

                            {/* Formulario para agregar cuenta rápida */}
                            {isAddingAccount && (
                                <div className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Nombre (ej. Banco Santander)"
                                            value={newAccountForm.name}
                                            onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                                            className="rounded-xl border border-crm-border bg-crm-bg p-2 text-xs text-white"
                                        />
                                        <select
                                            value={newAccountForm.type}
                                            onChange={(e) => setNewAccountForm({ ...newAccountForm, type: e.target.value })}
                                            className="rounded-xl border border-crm-border bg-crm-bg p-2 text-xs text-white"
                                        >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Banco">Banco</option>
                                            <option value="Billetera">Billetera</option>
                                        </select>
                                        <select
                                            value={newAccountForm.currency}
                                            onChange={(e) => setNewAccountForm({ ...newAccountForm, currency: e.target.value })}
                                            className="rounded-xl border border-crm-border bg-crm-bg p-2 text-xs text-white"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="ARS">ARS</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                placeholder="Saldo real"
                                                value={newAccountForm.balance || ''}
                                                onChange={(e) => setNewAccountForm({ ...newAccountForm, balance: e.target.value })}
                                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2 text-xs text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddAccount}
                                                className="rounded-xl bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-500"
                                            >
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-bg/70">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-crm-border bg-crm-surface text-crm-fg-muted font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3">Cuenta</th>
                                            <th className="p-3">Tipo / Moneda</th>
                                            <th className="p-3 text-right">Saldo en Sistema</th>
                                            <th className="p-3 text-right">Saldo Real Contado</th>
                                            <th className="p-3 text-right">Diferencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {combinedAccounts.map((acc, idx) => {
                                            const hasDiff = Math.abs(acc.difference) > 0.001;
                                            return (
                                                <tr key={acc.accountId || idx} className="hover:bg-crm-surface/50 transition-colors">
                                                    <td className="p-3 font-bold text-white">
                                                        {acc.name}
                                                        {acc.isNew && (
                                                            <span className="ml-2 rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                                                                Nueva
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-crm-fg-muted">
                                                        {acc.type} · <span className="font-bold text-white">{acc.currency}</span>
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-crm-fg-muted">
                                                        {formatMoney(acc.previousBalance, acc.currency)}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <input
                                                            type="number"
                                                            value={acc.realBalance}
                                                            onChange={(e) => handleBalanceChange(acc.accountId, e.target.value)}
                                                            className="w-36 rounded-lg border border-crm-border bg-crm-surface px-2.5 py-1.5 text-right font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                                        />
                                                    </td>
                                                    <td className={`p-3 text-right font-mono font-bold ${
                                                        !hasDiff
                                                            ? 'text-crm-fg-muted'
                                                            : acc.difference > 0
                                                            ? 'text-emerald-400'
                                                            : 'text-red-400'
                                                    }`}>
                                                        {hasDiff && (acc.difference > 0 ? '+' : '')}
                                                        {formatMoney(acc.difference, acc.currency)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sección de Regularización de Cuotas Históricas */}
                        <div className="rounded-2xl border border-crm-border bg-crm-bg/40 p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                        <FileCheck size={16} /> Regularizar Cuotas Históricas Cobradas
                                    </h4>
                                    <p className="mt-1 text-xs text-crm-fg-muted">
                                        Si ya cobraste cuotas antes de la fecha de corte y ese dinero ya está incluido en el saldo real que cargaste arriba, marcalas acá para dejarlas como pagadas <strong>sin volver a sumar dinero a caja</strong>.
                                    </p>
                                </div>
                            </div>

                            {pendingInstallments.length === 0 ? (
                                <p className="text-xs text-crm-fg-muted italic">No hay cuotas pendientes de regularización.</p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                    {pendingInstallments.map((inst) => {
                                        const isSelected = selectedInstallmentIds.includes(inst.id);
                                        return (
                                            <label
                                                key={inst.id}
                                                className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'border-purple-500/50 bg-purple-500/10'
                                                        : 'border-crm-border bg-crm-surface/70 hover:bg-crm-surface'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleInstallment(inst.id)}
                                                        className="h-4 w-4 rounded border-crm-border bg-crm-bg text-purple-600 focus:ring-0"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-white">
                                                            {inst.customerName} · {inst.vehicleName}
                                                        </p>
                                                        <p className="text-[11px] text-crm-fg-muted">
                                                            {inst.concept} · Vence: {new Date(inst.dueDate).toLocaleDateString('es-AR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-mono font-bold text-emerald-400">
                                                        {formatMoney(inst.amount, inst.currency)}
                                                    </p>
                                                    <span className="text-[10px] uppercase font-bold text-crm-fg-muted">
                                                        Sin duplicar caja
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Botón de Siguiente Paso */}
                        <div className="flex justify-between items-center pt-3 border-t border-crm-border">
                            <div className="text-xs text-crm-fg-muted">
                                Cuentas con diferencia: <strong className="text-white">{adjustedAccountsCount}</strong> · Cuotas a regularizar: <strong className="text-white">{selectedInstallmentIds.length}</strong>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                            >
                                Revisar Diferencias y Confirmar <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    /* Paso 2: Revisión Previa y Confirmación */
                    <div className="mt-6 space-y-6">
                        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-400" />
                                Resumen de Ajustes a Aplicar
                            </h3>
                            <p className="mt-1 text-xs text-purple-200/80 leading-relaxed">
                                Los siguientes ajustes se registrarán como movimientos patrimoniales con fecha de corte <strong>{new Date(cutoffDate).toLocaleDateString('es-AR')}</strong>. No afectarán las ventas ni la facturación del CRM.
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="rounded-xl border border-crm-border bg-crm-bg/80 p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Diferencia Neta USD</span>
                                    <p className={`mt-1 font-mono text-xl font-black ${diffUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {diffUSD > 0 ? '+' : ''}{formatMoney(diffUSD, 'USD')}
                                    </p>
                                    <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                        Nuevo total USD: {formatMoney(totalRealUSD, 'USD')}
                                    </span>
                                </div>
                                <div className="rounded-xl border border-crm-border bg-crm-bg/80 p-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Diferencia Neta ARS</span>
                                    <p className={`mt-1 font-mono text-xl font-black ${diffARS >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {diffARS > 0 ? '+' : ''}{formatMoney(diffARS, 'ARS')}
                                    </p>
                                    <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                        Nuevo total ARS: {formatMoney(totalRealARS, 'ARS')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detalle por Cuenta */}
                        <div className="rounded-2xl border border-crm-border bg-crm-bg p-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-crm-fg mb-3">
                                Cuentas con Ajustes ({adjustedAccountsCount})
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {combinedAccounts.filter(a => Math.abs(a.difference) > 0.001).map((acc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-crm-border/60 bg-crm-surface text-xs">
                                        <div>
                                            <span className="font-bold text-white">{acc.name}</span>
                                            <span className="text-crm-fg-muted ml-2 font-mono">
                                                (Anterior: {formatMoney(acc.previousBalance, acc.currency)})
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-mono font-bold ${acc.difference > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {acc.difference > 0 ? '+' : ''}{formatMoney(acc.difference, acc.currency)}
                                            </span>
                                            <span className="text-crm-fg-muted ml-2 font-mono">
                                                → Nuevo: {formatMoney(acc.realBalance, acc.currency)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {adjustedAccountsCount === 0 && (
                                    <p className="text-xs text-crm-fg-muted italic">Todos los saldos coinciden con los registros actuales.</p>
                                )}
                            </div>
                        </div>

                        {/* Cuotas Regularizadas */}
                        {selectedInstallmentIds.length > 0 && (
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                                <strong>✓ {selectedInstallmentIds.length} cuotas</strong> serán marcadas como pagadas con fecha de corte {new Date(cutoffDate).toLocaleDateString('es-AR')}, conservando la auditoría de que su cobro ya está incluido en el saldo conciliado y sin duplicar dinero en caja.
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="flex gap-3 pt-3 border-t border-crm-border">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white"
                            >
                                ← Volver y Modificar
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleConfirmSubmit}
                                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 p-3.5 text-xs font-black text-white hover:opacity-95 transition-opacity shadow-lg disabled:opacity-50"
                            >
                                {isSubmitting ? 'Aplicando Conciliación...' : 'Confirmar y Aplicar Ajustes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
