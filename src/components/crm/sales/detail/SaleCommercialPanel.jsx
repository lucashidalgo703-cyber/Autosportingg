import toast from 'react-hot-toast';
import React, { useState, useMemo } from 'react';
import { 
    DollarSign, 
    Info, 
    Landmark, 
    Edit2, 
    X, 
    Check, 
    Plus, 
    Trash2, 
    Calculator, 
    Calendar, 
    Percent, 
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import CrmInput from '../../ui/CrmInput';
import CrmSelect from '../../ui/CrmSelect';

// Formateador estándar con formato argentino (ARS / USD)
const formatMoney = (amount, currency = 'ARS') => {
    const num = Number(amount);
    if (isNaN(num)) return currency === 'USD' ? 'USD 0' : '$ 0';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency === 'USD' ? 'USD' : 'ARS',
        minimumFractionDigits: num % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    }).format(num);
};

// Función auxiliar para calcular valores de financiación y ajuste de redondeo
export const computeFinancingValues = (cashPrice, downPayment, interestRate, installmentsCount, includesDeposit = false) => {
    const cPrice = Math.max(0, Number(cashPrice) || 0);
    const dPayment = Math.max(0, Number(downPayment) || 0);
    const financedBalance = Math.max(0, cPrice - dPayment);
    const rate = Math.max(0, Number(interestRate) || 0);
    const interestAmount = (financedBalance * rate) / 100;
    const totalFinancedWithInterest = financedBalance + interestAmount;
    const count = Number(installmentsCount) || 1;

    let installmentAmount = 0;
    let lastInstallmentAmount = 0;
    let roundingAdjustment = 0;

    if (count > 0 && totalFinancedWithInterest > 0) {
        const base = Math.floor(totalFinancedWithInterest / count);
        roundingAdjustment = totalFinancedWithInterest - (base * count);
        installmentAmount = base;
        lastInstallmentAmount = base + roundingAdjustment;
    }

    const totalOperationPrice = dPayment + totalFinancedWithInterest;

    return {
        hasFinancing: true,
        cashPrice: cPrice,
        downPayment: dPayment,
        installmentsCount: count,
        interestRate: rate,
        financedBalance,
        interestAmount,
        totalFinancedWithInterest,
        installmentAmount,
        lastInstallmentAmount,
        totalOperationPrice,
        roundingAdjustment,
        includesDeposit: Boolean(includesDeposit)
    };
};

export default function SaleCommercialPanel({ sale, onSave }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        salePrice: 0,
        saleCurrency: 'ARS',
        paymentMethod: 'contado',
        depositAppliedAmount: 0,
        depositAppliedCurrency: 'ARS',
        commissionSettings: {
            extraAmount: 0,
            extraCurrency: 'ARS'
        },
        saleExpenses: [],
        // Apartado de financiación
        cashPrice: 0,
        downPayment: 0,
        installmentsCount: 18,
        interestRate: 0,
        includesDeposit: true,
        syncInstallmentPlan: true
    });

    if (!sale) return null;

    const handleEditClick = () => {
        const prevFin = sale.financingDetails || {};
        const isFin = (sale.paymentMethod || 'contado').toLowerCase() === 'financiado';
        const initialCashPrice = prevFin.cashPrice !== undefined && prevFin.cashPrice !== null 
            ? prevFin.cashPrice 
            : (sale.salePrice || 0);

        setEditForm({
            salePrice: sale.salePrice || 0,
            saleCurrency: sale.saleCurrency || 'ARS',
            paymentMethod: (sale.paymentMethod || 'contado').toLowerCase(),
            depositAppliedAmount: sale.depositAppliedAmount || 0,
            depositAppliedCurrency: sale.depositAppliedCurrency || sale.saleCurrency || 'ARS',
            commissionSettings: {
                extraAmount: sale.commissionSettings?.extraAmount || 0,
                extraCurrency: sale.commissionSettings?.extraCurrency || sale.saleCurrency || 'ARS'
            },
            saleExpenses: sale.saleExpenses || [],
            // Financiación
            cashPrice: initialCashPrice,
            downPayment: prevFin.downPayment !== undefined ? prevFin.downPayment : (sale.depositAppliedAmount || 0),
            installmentsCount: prevFin.installmentsCount || 18,
            interestRate: prevFin.interestRate !== undefined ? prevFin.interestRate : 0,
            includesDeposit: prevFin.includesDeposit !== undefined ? prevFin.includesDeposit : (sale.depositAppliedAmount > 0),
            syncInstallmentPlan: true
        });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    // Cálculos en tiempo real mientras se edita
    const liveFinancing = useMemo(() => {
        return computeFinancingValues(
            editForm.cashPrice,
            editForm.downPayment,
            editForm.interestRate,
            editForm.installmentsCount,
            editForm.includesDeposit
        );
    }, [editForm.cashPrice, editForm.downPayment, editForm.interestRate, editForm.installmentsCount, editForm.includesDeposit]);

    const handleSaveClick = async () => {
        if (!onSave) return;
        const isFinanced = editForm.paymentMethod?.toLowerCase() === 'financiado';

        // Validaciones en cliente
        if (isFinanced) {
            const cashPrice = Number(editForm.cashPrice);
            const downPayment = Number(editForm.downPayment || 0);
            const interestRate = Number(editForm.interestRate || 0);
            const installmentsCount = Number(editForm.installmentsCount);

            if (isNaN(cashPrice) || cashPrice <= 0) {
                toast.error('El precio al contado debe ser mayor que cero.');
                return;
            }
            if (isNaN(downPayment) || downPayment < 0 || downPayment > cashPrice) {
                toast.error('La entrega inicial debe estar entre cero y el precio al contado.');
                return;
            }
            if (isNaN(interestRate) || interestRate < 0) {
                toast.error('El interés total del plan no puede ser negativo.');
                return;
            }

            const financedBalance = Math.max(0, cashPrice - downPayment);
            if (financedBalance > 0 && ![6, 12, 18, 24].includes(installmentsCount)) {
                toast.error('Seleccioná una cantidad de cuotas válida (6, 12, 18 o 24).');
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                saleCurrency: editForm.saleCurrency,
                paymentMethod: editForm.paymentMethod,
                depositAppliedAmount: Number(editForm.depositAppliedAmount),
                depositAppliedCurrency: editForm.depositAppliedCurrency,
                commissionSettings: {
                    ...sale.commissionSettings,
                    extraAmount: Number(editForm.commissionSettings.extraAmount),
                    extraCurrency: editForm.commissionSettings.extraCurrency,
                    isManual: true
                },
                saleExpenses: editForm.saleExpenses.map(exp => ({
                    ...exp,
                    amount: Number(exp.amount)
                }))
            };

            if (isFinanced) {
                payload.financingDetails = liveFinancing;
                payload.salePrice = liveFinancing.totalOperationPrice;
                payload.syncInstallmentPlan = editForm.syncInstallmentPlan;
            } else {
                payload.financingDetails = null;
                payload.salePrice = Number(editForm.salePrice);
            }

            await onSave(payload);
            toast.success('Condiciones comerciales actualizadas exitosamente');
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving commercial conditions:", error);
            toast.error("Error al guardar: " + (error.message || 'Error desconocido'));
        } finally {
            setIsSaving(false);
        }
    };

    const canEdit = sale.status !== 'cancelada' && onSave;
    const isSaleFinanced = (sale.paymentMethod || 'contado').toLowerCase() === 'financiado';
    const isEditFinanced = editForm.paymentMethod?.toLowerCase() === 'financiado';
    const hasExistingFinancing = Boolean(sale.financingDetails?.hasFinancing);

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            {/* Header del Panel */}
            <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar p-4">
                <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-300" />
                    <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-crm-fg">Condiciones Comerciales</h3>
                </div>
                {canEdit && !isEditing && (
                    <button
                        onClick={handleEditClick}
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-crm-bg px-3 py-1.5 text-xs font-bold text-crm-fg transition-colors hover:bg-crm-surface-raised"
                    >
                        <Edit2 size={12} />
                        Editar
                    </button>
                )}
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-crm-bg px-2 py-1 text-xs font-bold text-crm-fg-muted transition-colors hover:text-white disabled:opacity-50"
                        >
                            <X size={14} />
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveClick}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50"
                        >
                            <Check size={14} />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-5 p-5">
                {/* SELECTOR DE MÉTODO DE PAGO */}
                <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Método de Pago</span>
                    {isEditing ? (
                        <CrmSelect 
                            value={editForm.paymentMethod} 
                            onChange={(e) => setEditForm({...editForm, paymentMethod: e.target.value.toLowerCase()})} 
                            className="h-9 bg-crm-surface text-xs font-bold"
                        >
                            <option value="contado">CONTADO</option>
                            <option value="financiado">FINANCIADO</option>
                        </CrmSelect>
                    ) : (
                        <div className="flex items-center gap-2 mt-1">
                            <Landmark size={14} className={isSaleFinanced ? "text-purple-400" : "text-emerald-400"} />
                            <span className="text-sm font-bold uppercase text-crm-fg">{sale.paymentMethod || 'contado'}</span>
                            {isSaleFinanced && (
                                <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300 border border-purple-500/20">
                                    Plan en cuotas
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ===== CASO: MÉTODO CONTADO (O NO FINANCIADO) ===== */}
                {((isEditing && !isEditFinanced) || (!isEditing && !isSaleFinanced)) && (
                    <div className={`flex flex-col gap-2 rounded-xl border p-4 ${isEditing ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-crm-border bg-crm-bg items-center justify-between flex-row'}`}>
                        <span className="text-sm font-bold text-crm-fg-muted">Precio al Contado</span>
                        {isEditing ? (
                            <div className="flex gap-2 w-full mt-1">
                                <div className="w-24 shrink-0">
                                    <CrmSelect 
                                        value={editForm.saleCurrency} 
                                        onChange={(e) => setEditForm({...editForm, saleCurrency: e.target.value})} 
                                        className="h-10 bg-crm-surface font-bold text-emerald-300 border-emerald-500/30 focus:border-emerald-400"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </CrmSelect>
                                </div>
                                <div className="flex-1">
                                    <CrmInput 
                                        type="number" 
                                        min="0" 
                                        value={editForm.salePrice} 
                                        onChange={(e) => setEditForm({...editForm, salePrice: e.target.value})} 
                                        className="h-10 bg-crm-surface font-bold text-emerald-300 border-emerald-500/30 focus:border-emerald-400" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <span className={`text-2xl font-black ${sale.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-emerald-300'}`}>
                                {formatMoney(sale.salePrice || 0, sale.saleCurrency || 'ARS')}
                            </span>
                        )}
                    </div>
                )}

                {/* ===== CASO: MÉTODO FINANCIADO EN MODO EDICIÓN ===== */}
                {isEditing && isEditFinanced && (
                    <div className="flex flex-col gap-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                        <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2">
                            <Calculator size={16} className="text-purple-300" />
                            <span className="text-xs font-bold uppercase tracking-[0.08em] text-purple-200">
                                Carga de Financiación
                            </span>
                        </div>

                        {/* Moneda y Precio al Contado */}
                        <div>
                            <label className="mb-1 block text-xs font-bold text-crm-fg-muted">
                                Precio del vehículo al contado *
                            </label>
                            <div className="flex gap-2">
                                <div className="w-24 shrink-0">
                                    <CrmSelect 
                                        value={editForm.saleCurrency} 
                                        onChange={(e) => setEditForm({...editForm, saleCurrency: e.target.value})} 
                                        className="h-9 bg-crm-surface font-bold text-purple-300"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </CrmSelect>
                                </div>
                                <div className="flex-1">
                                    <CrmInput 
                                        type="number" 
                                        min="1" 
                                        value={editForm.cashPrice} 
                                        onChange={(e) => setEditForm({...editForm, cashPrice: e.target.value})} 
                                        placeholder="Ej: 10500000"
                                        className="h-9 bg-crm-surface font-bold text-white text-right"
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] text-crm-fg-muted mt-1 block">
                                Base monetaria de la unidad para el cálculo del saldo a financiar.
                            </span>
                        </div>

                        {/* Entrega Inicial y Tratamiento de Seña */}
                        <div>
                            <label className="mb-1 block text-xs font-bold text-crm-fg-muted">
                                Entrega inicial *
                            </label>
                            <CrmInput 
                                type="number" 
                                min="0" 
                                max={editForm.cashPrice}
                                value={editForm.downPayment} 
                                onChange={(e) => setEditForm({...editForm, downPayment: e.target.value})} 
                                placeholder="Ej: 4500000"
                                className="h-9 bg-crm-surface font-bold text-white text-right"
                            />

                            {/* Revisión de Seña Existente */}
                            {sale.depositAppliedAmount > 0 && (
                                <div className="mt-2 flex items-start gap-2 rounded-lg border border-neutral-700 bg-crm-bg/80 p-2 text-xs">
                                    <input 
                                        type="checkbox"
                                        id="includesDeposit"
                                        checked={editForm.includesDeposit}
                                        onChange={(e) => setEditForm({...editForm, includesDeposit: e.target.checked})}
                                        className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                                    />
                                    <label htmlFor="includesDeposit" className="cursor-pointer text-crm-fg-muted leading-tight">
                                        La seña de <strong className="text-white">{formatMoney(sale.depositAppliedAmount, sale.depositAppliedCurrency || editForm.saleCurrency)}</strong> ya está incluida en la entrega inicial.
                                        <span className="block text-[10px] text-neutral-400 mt-0.5">
                                            (Evita contabilizarla dos veces contra el precio del vehículo).
                                        </span>
                                    </label>
                                </div>
                            )}

                            {Number(editForm.downPayment) >= Number(editForm.cashPrice) && Number(editForm.cashPrice) > 0 && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>La entrega cubre todo el precio; no queda saldo para financiar.</span>
                                </div>
                            )}
                        </div>

                        {/* Saldo Financiado Calculado */}
                        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-crm-bg p-2.5">
                            <span className="text-xs font-bold text-crm-fg-muted">Saldo a financiar</span>
                            <span className="text-sm font-bold text-white">
                                {formatMoney(liveFinancing.financedBalance, editForm.saleCurrency)}
                            </span>
                        </div>

                        {/* Cantidad de Cuotas e Interés Total */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-crm-fg-muted">
                                    Cantidad de cuotas *
                                </label>
                                <CrmSelect
                                    value={editForm.installmentsCount}
                                    onChange={(e) => setEditForm({...editForm, installmentsCount: Number(e.target.value)})}
                                    disabled={liveFinancing.financedBalance <= 0}
                                    className="h-9 bg-crm-surface text-xs font-bold"
                                >
                                    <option value={6}>6 cuotas</option>
                                    <option value={12}>12 cuotas</option>
                                    <option value={18}>18 cuotas</option>
                                    <option value={24}>24 cuotas</option>
                                </CrmSelect>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-crm-fg-muted">
                                    Interés total del plan (%) *
                                </label>
                                <div className="relative">
                                    <CrmInput 
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={editForm.interestRate}
                                        onChange={(e) => setEditForm({...editForm, interestRate: e.target.value})}
                                        disabled={liveFinancing.financedBalance <= 0}
                                        placeholder="0"
                                        className="h-9 bg-crm-surface font-bold text-white text-right pr-7"
                                    />
                                    <span className="absolute right-2.5 top-2 text-xs font-bold text-crm-fg-muted">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Aclaración obligatoria según requerimiento */}
                        <p className="m-0 text-[11px] text-purple-300/80 leading-normal bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                            <strong>Aclaración:</strong> Interés total sobre el saldo financiado; no es una tasa mensual.
                        </p>

                        {/* RESULTADOS EN VIVO DE LA FINANCIACIÓN */}
                        <div className="rounded-xl border border-neutral-700 bg-crm-bg p-3 flex flex-col gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                                Previsualización de Cálculos
                            </span>
                            <div className="flex justify-between text-xs">
                                <span className="text-crm-fg-muted">Interés en pesos ({liveFinancing.interestRate}%):</span>
                                <span className="font-bold text-white">{formatMoney(liveFinancing.interestAmount, editForm.saleCurrency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-crm-fg-muted">Total a cobrar en cuotas:</span>
                                <span className="font-bold text-purple-300">{formatMoney(liveFinancing.totalFinancedWithInterest, editForm.saleCurrency)}</span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-neutral-800 pt-1.5">
                                <span className="text-crm-fg-muted">Valor de cada cuota:</span>
                                <span className="font-bold text-white">
                                    {liveFinancing.installmentsCount} cuotas de {formatMoney(liveFinancing.installmentAmount, editForm.saleCurrency)}
                                    {liveFinancing.roundingAdjustment !== 0 && (
                                        <span className="block text-[10px] text-orange-300 text-right font-normal">
                                            (Última cuota: {formatMoney(liveFinancing.lastInstallmentAmount, editForm.saleCurrency)} por ajuste de redondeo)
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-neutral-800 pt-1.5">
                                <span className="font-bold text-crm-fg">Precio Total de la Operación:</span>
                                <span className="font-black text-emerald-400 text-sm">
                                    {formatMoney(liveFinancing.totalOperationPrice, editForm.saleCurrency)}
                                </span>
                            </div>
                        </div>

                        {/* Sincronización con módulo operativo de cuotas */}
                        <div className="flex items-start gap-2 pt-1 text-xs">
                            <input 
                                type="checkbox"
                                id="syncInstallmentPlan"
                                checked={editForm.syncInstallmentPlan}
                                onChange={(e) => setEditForm({...editForm, syncInstallmentPlan: e.target.checked})}
                                className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                            />
                            <label htmlFor="syncInstallmentPlan" className="cursor-pointer text-crm-fg-muted leading-tight">
                                Sincronizar automáticamente el cronograma operativo de {liveFinancing.installmentsCount} cuotas.
                                <span className="block text-[10px] text-neutral-400 mt-0.5">
                                    No genera ingresos de caja ni marca cuotas como pagadas. Si ya hay pagos registrados, se preserva el historial.
                                </span>
                            </label>
                        </div>
                    </div>
                )}

                {/* ===== CASO: MÉTODO FINANCIADO EN MODO VISUALIZACIÓN ===== */}
                {!isEditing && isSaleFinanced && (
                    <>
                        {/* Compatibilidad con ventas anteriores sin financiación */}
                        {!hasExistingFinancing ? (
                            <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                                    <AlertCircle size={18} />
                                    <span>Financiación pendiente de cargar</span>
                                </div>
                                <p className="text-xs text-amber-200/80 m-0">
                                    Esta venta está configurada como financiada pero aún no cuenta con los términos comerciales cargados. Hacé clic en "Editar" para completar el plan sin modificar datos históricos.
                                </p>
                            </div>
                        ) : (
                            /* FICHA COMPLETA DE FINANCIACIÓN */
                            <div className="flex flex-col gap-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
                                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Landmark size={16} className="text-purple-400" />
                                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-purple-200">
                                            Condiciones de Financiación
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                                        {sale.financingDetails.installmentsCount} Cuotas Pactadas
                                    </span>
                                </div>

                                {/* DISTINCIÓN CLARA: PRECIO AL CONTADO VS TOTAL FINANCIADO */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-neutral-700 bg-crm-bg p-3">
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted mb-1">
                                            Precio al Contado
                                        </span>
                                        <span className="text-lg font-black text-white">
                                            {formatMoney(sale.financingDetails.cashPrice, sale.saleCurrency || 'ARS')}
                                        </span>
                                    </div>

                                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-purple-300 mb-1">
                                            Precio Total Financiado
                                        </span>
                                        <span className="text-lg font-black text-purple-200">
                                            {formatMoney(sale.financingDetails.totalOperationPrice, sale.saleCurrency || 'ARS')}
                                        </span>
                                    </div>
                                </div>

                                {/* DETALLE COMPLETO DE CONDICIONES */}
                                <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-crm-bg p-3.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-crm-fg-muted">Entrega inicial:</span>
                                        <div className="text-right">
                                            <span className="font-bold text-white">
                                                {formatMoney(sale.financingDetails.downPayment, sale.saleCurrency || 'ARS')}
                                            </span>
                                            {sale.depositAppliedAmount > 0 && sale.financingDetails.includesDeposit && (
                                                <span className="block text-[10px] text-emerald-400">
                                                    (Incluye {formatMoney(sale.depositAppliedAmount, sale.depositAppliedCurrency || sale.saleCurrency)} de seña)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2">
                                        <span className="text-crm-fg-muted">Saldo financiado:</span>
                                        <span className="font-bold text-white">
                                            {formatMoney(sale.financingDetails.financedBalance, sale.saleCurrency || 'ARS')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2">
                                        <span className="text-crm-fg-muted">
                                            Interés aplicado ({sale.financingDetails.interestRate}%):
                                        </span>
                                        <div className="text-right">
                                            <span className="font-bold text-purple-300">
                                                {formatMoney(sale.financingDetails.interestAmount, sale.saleCurrency || 'ARS')}
                                            </span>
                                            <span className="block text-[9px] text-neutral-400">
                                                (Total sobre saldo financiado; no es tasa mensual)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2">
                                        <span className="text-crm-fg-muted">Total a cobrar en cuotas:</span>
                                        <span className="font-bold text-purple-300">
                                            {formatMoney(sale.financingDetails.totalFinancedWithInterest, sale.saleCurrency || 'ARS')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2 bg-neutral-900/40 -mx-3.5 px-3.5 py-1.5 rounded">
                                        <span className="font-semibold text-crm-fg">Cuotas y valor:</span>
                                        <div className="text-right">
                                            <span className="font-black text-white">
                                                {sale.financingDetails.installmentsCount} cuotas de {formatMoney(sale.financingDetails.installmentAmount, sale.saleCurrency || 'ARS')}
                                            </span>
                                            {sale.financingDetails.roundingAdjustment !== 0 && (
                                                <span className="block text-[10px] text-orange-300">
                                                    (Última cuota ajustada: {formatMoney(sale.financingDetails.lastInstallmentAmount, sale.saleCurrency || 'ARS')})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-neutral-700 pt-2.5 mt-1">
                                        <span className="font-bold text-emerald-300">Precio total de la operación:</span>
                                        <span className="text-base font-black text-emerald-400">
                                            {formatMoney(sale.financingDetails.totalOperationPrice, sale.saleCurrency || 'ARS')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* SEÑA APLICADA (INFORMACIÓN INDEPENDIENTE) */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Seña Registrada</span>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <div className="w-16 shrink-0">
                                    <CrmSelect 
                                        value={editForm.depositAppliedCurrency} 
                                        onChange={(e) => setEditForm({...editForm, depositAppliedCurrency: e.target.value})} 
                                        className="h-8 bg-crm-surface px-1 text-xs font-bold"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </CrmSelect>
                                </div>
                                <div className="flex-1">
                                    <CrmInput 
                                        type="number" 
                                        min="0" 
                                        value={editForm.depositAppliedAmount} 
                                        onChange={(e) => setEditForm({...editForm, depositAppliedAmount: e.target.value})} 
                                        className="h-8 bg-crm-surface px-2 text-xs font-bold text-right" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-1">
                                <span className="text-sm font-bold text-crm-fg">
                                    {sale.depositAppliedAmount > 0
                                        ? formatMoney(sale.depositAppliedAmount, sale.depositAppliedCurrency || sale.saleCurrency)
                                        : 'Sin seña registrada'
                                    }
                                </span>
                            </div>
                        )}
                    </div>

                    {/* COMISIÓN VENDEDOR */}
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted text-right">Comisión Vendedor</span>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <div className="w-16 shrink-0">
                                    <CrmSelect 
                                        value={editForm.commissionSettings.extraCurrency} 
                                        onChange={(e) => setEditForm({...editForm, commissionSettings: {...editForm.commissionSettings, extraCurrency: e.target.value}})} 
                                        className="h-8 bg-crm-surface px-1 text-xs font-bold"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </CrmSelect>
                                </div>
                                <div className="flex-1">
                                    <CrmInput 
                                        type="number" 
                                        step="any"
                                        min="0" 
                                        value={editForm.commissionSettings.extraAmount} 
                                        onChange={(e) => setEditForm({...editForm, commissionSettings: {...editForm.commissionSettings, extraAmount: e.target.value}})} 
                                        className="h-8 bg-crm-surface px-2 text-xs font-bold text-right" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-right mt-1">
                                <span className="text-sm font-bold text-crm-fg">
                                    {sale.commissionSettings?.extraAmount > 0
                                        ? formatMoney(sale.commissionSettings.extraAmount, sale.commissionSettings.extraCurrency)
                                        : 'Sin comisión'
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* GASTOS DE LA VENTA */}
                <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Gastos de Venta</span>
                        {isEditing && (
                            <button
                                onClick={() => setEditForm({
                                    ...editForm,
                                    saleExpenses: [...editForm.saleExpenses, { description: '', amount: 0, currency: editForm.saleCurrency, status: 'Pendiente' }]
                                })}
                                className="flex items-center gap-1 text-[10px] font-bold text-crm-fg-muted hover:text-white"
                            >
                                <Plus size={12} /> Agregar Gasto
                            </button>
                        )}
                    </div>
                    
                    {!isEditing ? (
                        <div className="flex flex-col gap-2">
                            {sale.saleExpenses?.length > 0 ? (
                                sale.saleExpenses.map((exp, i) => (
                                    <div key={i} className="flex items-center justify-between border-t border-crm-border/50 pt-2 first:border-0 first:pt-0">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-crm-fg">{exp.description}</span>
                                            <span className={`text-[10px] font-bold uppercase ${exp.status === 'Pagado' ? 'text-emerald-400' : exp.status === 'En Proceso' ? 'text-blue-400' : 'text-crm-red'}`}>
                                                {exp.status}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-crm-fg-muted">
                                            {formatMoney(exp.amount, exp.currency)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-crm-fg-muted">No hay gastos registrados</span>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {editForm.saleExpenses.map((exp, i) => (
                                <div key={i} className="flex flex-col gap-2 rounded-lg border border-crm-border bg-crm-surface p-2">
                                    <div className="flex items-center gap-2">
                                        <CrmInput 
                                            value={exp.description}
                                            onChange={(e) => {
                                                const newExpenses = [...editForm.saleExpenses];
                                                newExpenses[i].description = e.target.value;
                                                setEditForm({...editForm, saleExpenses: newExpenses});
                                            }}
                                            placeholder="Descripción (ej. Transferencia, Patentes)"
                                            className="h-8 flex-1 bg-crm-bg px-2 text-xs font-bold"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newExpenses = editForm.saleExpenses.filter((_, idx) => idx !== i);
                                                setEditForm({...editForm, saleExpenses: newExpenses});
                                            }}
                                            className="text-crm-fg-muted hover:text-crm-red"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CrmSelect
                                            value={exp.currency}
                                            onChange={(e) => {
                                                const newExpenses = [...editForm.saleExpenses];
                                                newExpenses[i].currency = e.target.value;
                                                setEditForm({...editForm, saleExpenses: newExpenses});
                                            }}
                                            className="h-8 w-16 bg-crm-bg px-1 text-xs font-bold"
                                        >
                                            <option value="ARS">ARS</option>
                                            <option value="USD">USD</option>
                                        </CrmSelect>
                                        <CrmInput 
                                            type="number" 
                                            min="0" 
                                            value={exp.amount} 
                                            onChange={(e) => {
                                                const newExpenses = [...editForm.saleExpenses];
                                                newExpenses[i].amount = e.target.value;
                                                setEditForm({...editForm, saleExpenses: newExpenses});
                                            }} 
                                            className="h-8 flex-1 bg-crm-bg px-2 text-xs font-bold text-right" 
                                        />
                                        <CrmSelect
                                            value={exp.status}
                                            onChange={(e) => {
                                                const newExpenses = [...editForm.saleExpenses];
                                                newExpenses[i].status = e.target.value;
                                                setEditForm({...editForm, saleExpenses: newExpenses});
                                            }}
                                            className="h-8 w-24 bg-crm-bg px-1 text-[10px] font-bold"
                                        >
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="En Proceso">En Proceso</option>
                                            <option value="Pagado">Pagado</option>
                                        </CrmSelect>
                                    </div>
                                </div>
                            ))}
                            {editForm.saleExpenses.length === 0 && (
                                <span className="text-xs text-crm-fg-muted text-center py-2">Sin gastos añadidos</span>
                            )}
                        </div>
                    )}
                </div>

                {/* VEHÍCULO TOMADO / PERMUTA */}
                {sale.tradeInTotalAmount > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-purple-300">Vehículo Tomado (Permuta)</span>
                        <span className="text-sm font-bold text-purple-200">
                            - {formatMoney(sale.tradeInTotalAmount, sale.saleCurrency || 'ARS')}
                        </span>
                    </div>
                )}

                {/* GANANCIA Y FLUJO DE EFECTIVO */}
                <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 mt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-300">
                                Ganancia Nominal Proyectada
                            </span>
                            <span className="text-[10px] text-emerald-300/70 mt-0.5">
                                (Total Operación − Costo Compra − Comisión − Gastos)
                            </span>
                        </div>
                        <span className="text-xl font-black text-emerald-400">
                            {(() => {
                                const currentPrice = isEditing 
                                    ? (isEditFinanced ? liveFinancing.totalOperationPrice : Number(editForm.salePrice))
                                    : (sale.financingDetails?.hasFinancing ? sale.financingDetails.totalOperationPrice : (sale.salePrice || 0));
                                
                                const currentCurrency = isEditing ? editForm.saleCurrency : (sale.saleCurrency || 'ARS');
                                const currentCommission = isEditing ? Number(editForm.commissionSettings?.extraAmount || 0) : (sale.commissionSettings?.extraAmount || 0);
                                const purchasePrice = sale.vehicleId?.purchasePrice || 0;
                                const expensesList = isEditing ? editForm.saleExpenses : (sale.saleExpenses || []);
                                
                                const totalExpenses = expensesList
                                    .filter(exp => exp.currency === currentCurrency)
                                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
                                
                                const profit = currentPrice - purchasePrice - currentCommission - totalExpenses;
                                return formatMoney(profit, currentCurrency);
                            })()}
                        </span>
                    </div>

                    {/* DIFERENCIACIÓN OBLIGATORIA: GANANCIA PROYECTADA VS EFECTIVO DISPONIBLE */}
                    {isSaleFinanced && hasExistingFinancing && (
                        <div className="mt-2 border-t border-emerald-500/20 pt-2 text-[11px] text-emerald-200/80 leading-relaxed">
                            <p className="m-0">
                                <strong>Flujo de caja:</strong> Las cuotas pendientes ({formatMoney(sale.financingDetails.totalFinancedWithInterest, sale.saleCurrency)}) y el interés pactado ({formatMoney(sale.financingDetails.interestAmount, sale.saleCurrency)}) corresponden a ganancia proyectada en el tiempo y <strong>no constituyen efectivo disponible en caja</strong> hasta su cobro efectivo.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-auto flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 mt-4">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-300" />
                    <p className="m-0 text-xs leading-5 text-blue-100/80">
                        Los cobros, facturación, cuotas y comisiones se gestionan en los módulos financieros. Esta vista es exclusivamente comercial.
                    </p>
                </div>
            </div>
        </div>
    );
}
