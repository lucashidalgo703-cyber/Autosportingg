"use client";

import React, { useState, useEffect } from 'react';
import {
    ArrowDownRight,
    DollarSign,
    Wallet,
    Calendar,
    User,
    Car,
    FileCheck,
    CheckCircle2,
    Clock,
    X,
    SlidersHorizontal,
    MinusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasuryCollectAndDistributeModal({
    isOpen,
    onClose,
    accounts = [],
    boxes = [],
    pendingInstallments = [],
    treasuryToken,
    onSuccess
}) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Tipo de origen
    const [collectionType, setCollectionType] = useState('cuota'); // 'cuota' | 'venta' | 'general'
    const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [vehicleInfo, setVehicleInfo] = useState('');

    // Monto y cuenta
    const [currency, setCurrency] = useState('ARS');
    const [grossAmount, setGrossAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState(todayStr);
    const [notes, setNotes] = useState('');

    // Deducción / Comisiones a Inversores / Consignatarios
    const [hasDeduction, setHasDeduction] = useState(false);
    const [deductionAmount, setDeductionAmount] = useState('');
    const [deductionRecipient, setDeductionRecipient] = useState('');
    const [deductionReason, setDeductionReason] = useState('Comisión / Retorno a Inversor');

    // Distribución personalizada por caja
    const [boxAllocations, setBoxAllocations] = useState({});
    const [showDistributionDetail, setShowDistributionDetail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Al seleccionar una cuota del select
    useEffect(() => {
        if (selectedInstallmentId && pendingInstallments.length > 0) {
            const inst = pendingInstallments.find(i => (i._id || i.id) === selectedInstallmentId);
            if (inst) {
                setGrossAmount(inst.amount || '');
                setCurrency(inst.currency || 'ARS');
                setCustomerName(inst.customerName || '');
                setVehicleInfo(inst.vehicleInfo || '');
                setNotes(`Cobro de Cuota ${inst.installmentNumber} - ${inst.customerName || ''}`);
            }
        }
    }, [selectedInstallmentId, pendingInstallments]);

    // Establecer cuenta predeterminada
    useEffect(() => {
        if (accounts.length > 0 && !accountId) {
            const defaultAcc = accounts.find(a => a.currency === currency) || accounts[0];
            if (defaultAcc) setAccountId(defaultAcc._id);
        }
    }, [accounts, currency, accountId]);

    // Calcular monto neto
    const grossNum = parseFloat(grossAmount) || 0;
    const dedNum = hasDeduction ? (parseFloat(deductionAmount) || 0) : 0;
    const netAmount = Math.max(0, grossNum - dedNum);

    // Calcular distribución sugerida automática por prioridades y faltantes
    useEffect(() => {
        if (netAmount <= 0 || boxes.length === 0) return;

        let remaining = netAmount;
        const suggested = {};

        // Prioridad 1: Operativa (compromisos pendientes)
        const opBox = boxes.find(b => b.key === 'operativa');
        const opDeficit = opBox?.uncoveredCommitmentsARS || 0;
        const opAlloc = Math.min(remaining, opDeficit > 0 ? opDeficit : Math.round(netAmount * 0.15));
        suggested.operativa = opAlloc;
        remaining -= opAlloc;

        // Prioridad 2: Impuestos (compromisos tributarios)
        const impBox = boxes.find(b => b.key === 'impuestos');
        const impDeficit = impBox?.commitmentsARS || 0;
        const impAlloc = Math.min(remaining, impDeficit > 0 ? impDeficit : Math.round(netAmount * 0.10));
        suggested.impuestos = impAlloc;
        remaining -= impAlloc;

        // Prioridad 3: Personal
        const persAlloc = Math.min(remaining, Math.round(netAmount * 0.15));
        suggested.personal = persAlloc;
        remaining -= persAlloc;

        // Prioridad 4: Deudas
        const deudasBox = boxes.find(b => b.key === 'deudas');
        const deudasDeficit = deudasBox?.commitmentsARS || 0;
        const deudasAlloc = Math.min(remaining, deudasDeficit > 0 ? deudasDeficit : 0);
        suggested.deudas = deudasAlloc;
        remaining -= deudasAlloc;

        // Prioridad 5: Postventa (5%)
        const pvAlloc = Math.min(remaining, Math.round(netAmount * 0.05));
        suggested.postventa = pvAlloc;
        remaining -= pvAlloc;

        // Prioridad 6: Reserva (15%)
        const resAlloc = Math.min(remaining, Math.round(netAmount * 0.15));
        suggested.reserva = resAlloc;
        remaining -= resAlloc;

        // Prioridad 7: Stock (remamente principal)
        const stockAlloc = Math.round(remaining * 0.80);
        suggested.stock = stockAlloc;
        remaining -= stockAlloc;

        // Prioridad 8: Crecimiento (lo que sobre)
        suggested.crecimiento = remaining;

        setBoxAllocations(suggested);
    }, [netAmount, boxes]);

    if (!isOpen) return null;

    const handleBoxAllocChange = (key, val) => {
        setBoxAllocations(prev => ({
            ...prev,
            [key]: parseFloat(val) || 0
        }));
    };

    // Confirmar Cobro (distributeImmediately = true | false)
    const handleConfirm = async (distributeImmediately) => {
        if (!accountId) {
            toast.error('Seleccioná la cuenta donde ingresa el dinero');
            return;
        }
        if (grossNum <= 0) {
            toast.error('Ingresá un importe válido');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const distributionArray = distributeImmediately
                ? Object.entries(boxAllocations).map(([boxKey, amt]) => ({
                    boxKey,
                    amount: Number(amt || 0)
                })).filter(x => x.amount > 0)
                : [];

            const payload = {
                installmentId: collectionType === 'cuota' ? selectedInstallmentId : null,
                accountId,
                amount: grossNum,
                currency,
                date,
                notes: notes || `Cobro de ${collectionType} - ${customerName}`,
                customerName,
                vehicleInfo,
                investorDeduction: hasDeduction ? dedNum : 0,
                investorRecipient: hasDeduction ? deductionRecipient : null,
                investorReason: hasDeduction ? deductionReason : null,
                distributeImmediately,
                distribution: distributionArray
            };

            const res = await fetch('/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
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
                toast.error(data.message || 'Error al registrar el cobro');
                return;
            }

            toast.success(data.message || (distributeImmediately ? 'Cobro registrado y distribuido a cajas.' : 'Cobro registrado en cuenta y acumulado para distribuir.'));
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al procesar el cobro.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border border-purple-500/30 bg-crm-surface shadow-2xl overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                            <ArrowDownRight size={20} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white">Flujo Rápido: Cobrar y Distribuir</h3>
                                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                    Un Solo Paso
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Registra el cobro en cuenta bancaria y asigna el neto a las cajas estratégicas sin doble carga.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-crm-fg-muted hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Selector de Tipo de Cobro */}
                    <div className="flex items-center gap-2 rounded-2xl bg-crm-bg p-1 border border-crm-border">
                        <button
                            type="button"
                            onClick={() => setCollectionType('cuota')}
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${collectionType === 'cuota' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                        >
                            Cuota de Financiación
                        </button>
                        <button
                            type="button"
                            onClick={() => setCollectionType('venta')}
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${collectionType === 'venta' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                        >
                            Anticipo / Venta Auto
                        </button>
                        <button
                            type="button"
                            onClick={() => setCollectionType('general')}
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-colors ${collectionType === 'general' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                        >
                            Otro Ingreso
                        </button>
                    </div>

                    {/* Si es cuota, selector de cuotas pendientes */}
                    {collectionType === 'cuota' && (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Seleccionar Cuota Pendiente
                            </label>
                            <select
                                value={selectedInstallmentId}
                                onChange={(e) => setSelectedInstallmentId(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            >
                                <option value="">-- Seleccionar cuota del CRM --</option>
                                {pendingInstallments.map((inst) => (
                                    <option key={inst._id || inst.id} value={inst._id || inst.id}>
                                        {inst.customerName} - Cuota {inst.installmentNumber} ({formatMoney(inst.amount, inst.currency)}) - {inst.vehicleInfo || ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Monto Bruto, Moneda y Cuenta */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Moneda
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                            >
                                <option value="ARS">Pesos (ARS)</option>
                                <option value="USD">Dólares (USD)</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Importe Bruto Cobrado
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={grossAmount}
                                onChange={(e) => setGrossAmount(e.target.value)}
                                placeholder="0"
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Cuenta de Ingreso
                            </label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                required
                            >
                                <option value="">-- Seleccionar cuenta --</option>
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>
                                        {acc.name} ({acc.currency} - {acc.type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Fecha de Operación
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Sección Deducción a Inversores / Consignatarios */}
                    <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                    Deducir comisiones o pagos a inversores / consignatarios
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={hasDeduction}
                                onChange={(e) => setHasDeduction(e.target.checked)}
                                className="rounded border-crm-border text-purple-600 focus:ring-0 cursor-pointer h-4 w-4"
                            />
                        </div>

                        {hasDeduction && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-crm-border/40">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Importe Deducción
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={deductionAmount}
                                        onChange={(e) => setDeductionAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full rounded-xl border border-crm-border bg-crm-surface p-2 font-mono text-xs text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Destinatario / Inversor
                                    </label>
                                    <input
                                        type="text"
                                        value={deductionRecipient}
                                        onChange={(e) => setDeductionRecipient(e.target.value)}
                                        placeholder="Ej: Inversor Carlos M."
                                        className="w-full rounded-xl border border-crm-border bg-crm-surface p-2 text-xs text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-crm-fg-muted mb-1">
                                        Concepto
                                    </label>
                                    <input
                                        type="text"
                                        value={deductionReason}
                                        onChange={(e) => setDeductionReason(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-surface p-2 text-xs text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tarjeta de Resumen Neto a Distribuir */}
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                                Neto Real a Distribuir entre Cajas
                            </span>
                            <span className="text-xs text-crm-fg-muted">
                                {hasDeduction ? `Bruto: ${formatMoney(grossNum, currency)} - Deducción: ${formatMoney(dedNum, currency)}` : 'Sin deducciones aplicadas'}
                            </span>
                        </div>
                        <p className="font-mono text-2xl font-black text-white">
                            {formatMoney(netAmount, currency)}
                        </p>
                    </div>

                    {/* Desglose Sugerido por Cajas */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <SlidersHorizontal size={14} className="text-purple-300" />
                                Sugerencia de Distribución por Prioridad
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowDistributionDetail(!showDistributionDetail)}
                                className="text-[11px] font-bold text-purple-300 hover:underline"
                            >
                                {showDistributionDetail ? 'Ocultar detalle' : 'Ajustar montos por caja'}
                            </button>
                        </div>

                        {showDistributionDetail && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-crm-bg/80 border border-crm-border rounded-2xl">
                                {boxes.map((box) => (
                                    <div key={box.key} className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-crm-fg-muted block truncate">
                                            {box.name}
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={boxAllocations[box.key] || 0}
                                            onChange={(e) => handleBoxAllocChange(box.key, e.target.value)}
                                            className="w-full rounded-lg border border-crm-border bg-crm-surface px-2 py-1 font-mono text-xs font-bold text-white focus:outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie del Modal con Doble Botón: Distribuir Ahora vs Distribuir Después */}
                <div className="p-4 border-t border-crm-border bg-crm-surface/90 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                    >
                        Cancelar
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            disabled={isSubmitting || netAmount <= 0}
                            onClick={() => handleConfirm(false)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/25 disabled:opacity-50 transition-colors"
                            title="Ingresa a cuenta bancaria y queda pendiente en la bandeja de Tesorería para revisión agrupada"
                        >
                            <Clock size={15} /> Cobrar y Distribuir Después
                        </button>

                        <button
                            type="button"
                            disabled={isSubmitting || netAmount <= 0}
                            onClick={() => handleConfirm(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-600/20"
                            title="Ingresa a cuenta y asigna inmediatamente el neto a las 8 cajas"
                        >
                            <CheckCircle2 size={16} /> Cobrar y Distribuir Ahora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
