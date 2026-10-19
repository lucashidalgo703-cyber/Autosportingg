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
import { computeCommissionAmount, computeSaleProfit, parseDecimal, validateCommissionPercent } from '../../../../utils/saleCommercial';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';

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
export const computeFinancingValues = (
    cashPrice, 
    downPayment, 
    interestRate, 
    installmentsCount, 
    includesDeposit = false,
    calculationMode = 'by_installment',
    customInstallmentAmount = 0
) => {
    const cPrice = Math.max(0, Number(cashPrice) || 0);
    const dPayment = Math.max(0, Number(downPayment) || 0);
    const financedBalance = Math.max(0, cPrice - dPayment);
    const count = Number(installmentsCount) || 1;

    let rate = Math.max(0, Number(interestRate) || 0);
    let interestAmount = 0;
    let totalFinancedWithInterest = 0;
    let installmentAmount = 0;
    let lastInstallmentAmount = 0;
    let roundingAdjustment = 0;

    const cuotaInput = Number(customInstallmentAmount || 0);

    if (calculationMode === 'by_installment' && cuotaInput > 0) {
        installmentAmount = cuotaInput;
        lastInstallmentAmount = cuotaInput;
        roundingAdjustment = 0;
        totalFinancedWithInterest = cuotaInput * count;
        interestAmount = Math.max(0, totalFinancedWithInterest - financedBalance);
        rate = financedBalance > 0 ? Number(((interestAmount / financedBalance) * 100).toFixed(2)) : 0;
    } else {
        interestAmount = (financedBalance * rate) / 100;
        totalFinancedWithInterest = financedBalance + interestAmount;
        if (count > 0 && totalFinancedWithInterest > 0) {
            const base = Math.floor(totalFinancedWithInterest / count);
            roundingAdjustment = totalFinancedWithInterest - (base * count);
            installmentAmount = base;
            lastInstallmentAmount = base + roundingAdjustment;
        }
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
        includesDeposit: Boolean(includesDeposit),
        calculationMode,
        customInstallmentAmount: calculationMode === 'by_installment' ? installmentAmount : undefined
    };
};

export default function SaleCommercialPanel({ sale, onSave, planActions }) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [planCancel, setPlanCancel] = useState(null); // { preview, reason, busy }
    const [previewExchangeRate, setPreviewExchangeRate] = useState('');

    const [editForm, setEditForm] = useState({
        salePrice: 0,
        saleCurrency: 'ARS',
        exchangeRate: '',
        paymentMethod: 'contado',
        depositAppliedAmount: 0,
        depositAppliedCurrency: 'ARS',
        commissionSettings: {
            mode: 'fixed',
            percent: '',
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
        syncInstallmentPlan: true,
        calculationMode: 'by_installment',
        customInstallmentAmount: ''
    });

    if (!sale) return null;

    const canViewCostAndProfit = sale.canViewCostAndProfit !== undefined
        ? Boolean(sale.canViewCostAndProfit)
        : (['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.FINANZAS_READ));

    const handleEditClick = () => {
        const prevFin = sale.financingDetails || {};
        const initialCashPrice = prevFin.cashPrice !== undefined && prevFin.cashPrice !== null 
            ? prevFin.cashPrice 
            : (sale.salePrice || 0);

        const initialMode = prevFin.calculationMode || 'by_installment';
        const initialCuota = prevFin.installmentAmount !== undefined ? prevFin.installmentAmount : '';

        setEditForm({
            salePrice: sale.salePrice || 0,
            saleCurrency: sale.saleCurrency || 'ARS',
            exchangeRate: sale.exchangeRate !== undefined && sale.exchangeRate !== null ? String(sale.exchangeRate) : '',
            paymentMethod: (sale.paymentMethod || 'contado').toLowerCase(),
            depositAppliedAmount: sale.depositAppliedAmount || 0,
            depositAppliedCurrency: sale.depositAppliedCurrency || sale.saleCurrency || 'ARS',
            commissionSettings: {
                mode: sale.commissionSettings?.mode === 'percent' ? 'percent' : 'fixed',
                percent: sale.commissionSettings?.percent ?? '',
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
            syncInstallmentPlan: true,
            calculationMode: initialMode,
            customInstallmentAmount: initialCuota
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
            editForm.includesDeposit,
            editForm.calculationMode,
            editForm.customInstallmentAmount
        );
    }, [
        editForm.cashPrice, 
        editForm.downPayment, 
        editForm.interestRate, 
        editForm.installmentsCount, 
        editForm.includesDeposit,
        editForm.calculationMode,
        editForm.customInstallmentAmount
    ]);

    // Comisión y ganancia en vivo (el servidor recalcula y valida al guardar)
    const isPercentEdit = editForm.commissionSettings.mode === 'percent';
    const livePrice = isEditing
        ? ((editForm.paymentMethod?.toLowerCase() === 'financiado') ? liveFinancing.totalOperationPrice : (Number(editForm.salePrice) || 0))
        : (sale.salePrice || 0);
    const liveCurrency = isEditing ? editForm.saleCurrency : (sale.saleCurrency || 'ARS');
    const liveCommission = (() => {
        if (isEditing) {
            if (isPercentEdit) {
                return { amount: computeCommissionAmount(livePrice, editForm.commissionSettings.percent), currency: liveCurrency };
            }
            const fixedAmt = Number(editForm.commissionSettings.extraAmount) || 0;
            return { amount: fixedAmt, currency: fixedAmt > 0 ? (editForm.commissionSettings.extraCurrency || liveCurrency) : liveCurrency };
        }
        const savedPercent = sale.commissionSettings?.mode === 'percent' &&
            sale.commissionSettings?.percent !== undefined &&
            sale.commissionSettings?.percent !== null &&
            String(sale.commissionSettings.percent).trim() !== '';
        if (savedPercent) {
            return { amount: computeCommissionAmount(livePrice, sale.commissionSettings.percent), currency: liveCurrency };
        }
        const savedAmt = Number(sale.commissionSettings?.extraAmount) || 0;
        return { amount: savedAmt, currency: savedAmt > 0 ? (sale.commissionSettings?.extraCurrency || liveCurrency) : liveCurrency };
    })();

    const activeExchangeRate = (() => {
        if (isEditing) {
            const parsed = parseDecimal(editForm.exchangeRate);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        }
        if (previewExchangeRate !== '') {
            const parsed = parseDecimal(previewExchangeRate);
            if (Number.isFinite(parsed) && parsed > 0) return parsed;
        }
        return Number(sale.exchangeRate) > 0 ? Number(sale.exchangeRate) : null;
    })();

    const vehicleObj = sale.vehicleId && typeof sale.vehicleId === 'object' ? sale.vehicleId : null;
    const liveProfit = computeSaleProfit({
        salePrice: livePrice,
        saleCurrency: liveCurrency,
        vehicle: vehicleObj,
        legacyTradeInOrigin: vehicleObj?.resolvedTradeInOrigin || null,
        vehicleExpenses: vehicleObj?.expenses || [],
        saleExpenses: isEditing ? editForm.saleExpenses : (sale.saleExpenses || []),
        commissionSettings: isEditing ? editForm.commissionSettings : sale.commissionSettings,
        commissionAmount: liveCommission.amount,
        commissionCurrency: liveCommission.currency,
        exchangeRate: activeExchangeRate
    });

    const handleSaveClick = async () => {
        if (!onSave) return;
        const isFinanced = editForm.paymentMethod?.toLowerCase() === 'financiado';

        if (editForm.commissionSettings.mode === 'percent') {
            const check = validateCommissionPercent(editForm.commissionSettings.percent);
            if (!check.ok) {
                toast.error(check.message);
                return;
            }
        }

        if (editForm.exchangeRate !== '' && editForm.exchangeRate !== null && editForm.exchangeRate !== undefined) {
            const parsedRate = parseDecimal(editForm.exchangeRate);
            if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
                toast.error('La cotización USD/ARS debe ser un número mayor a cero.');
                return;
            }
        }

        // Validaciones en cliente
        if (isFinanced) {
            const cashPrice = Number(editForm.cashPrice);
            const downPayment = Number(editForm.downPayment || 0);
            const installmentsCount = Number(editForm.installmentsCount);
            const mode = editForm.calculationMode || 'by_installment';

            if (isNaN(cashPrice) || cashPrice <= 0) {
                toast.error('El precio al contado debe ser mayor que cero.');
                return;
            }
            if (isNaN(downPayment) || downPayment < 0 || downPayment > cashPrice) {
                toast.error('La entrega inicial debe estar entre cero y el precio al contado.');
                return;
            }

            const financedBalance = Math.max(0, cashPrice - downPayment);
            if (financedBalance > 0 && ![6, 12, 18, 24].includes(installmentsCount)) {
                toast.error('Seleccioná una cantidad de cuotas válida (6, 12, 18 o 24).');
                return;
            }

            if (mode === 'by_installment') {
                const cuotaVal = Number(editForm.customInstallmentAmount || 0);
                if (financedBalance > 0 && (isNaN(cuotaVal) || cuotaVal <= 0)) {
                    toast.error('Ingresá un valor de cuota válido mayor que cero.');
                    return;
                }
                if (financedBalance > 0 && (cuotaVal * installmentsCount < financedBalance)) {
                    toast.error('El total en cuotas no puede ser inferior al saldo a financiar.');
                    return;
                }
            } else {
                const interestRate = Number(editForm.interestRate || 0);
                if (isNaN(interestRate) || interestRate < 0) {
                    toast.error('El interés total del plan no puede ser negativo.');
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                saleCurrency: editForm.saleCurrency,
                exchangeRate: editForm.exchangeRate === '' ? null : parseDecimal(editForm.exchangeRate),
                paymentMethod: editForm.paymentMethod,
                depositAppliedAmount: Number(editForm.depositAppliedAmount),
                depositAppliedCurrency: editForm.depositAppliedCurrency,
                commissionSettings: editForm.commissionSettings.mode === 'percent'
                    ? {
                        mode: 'percent',
                        percent: parseDecimal(editForm.commissionSettings.percent)
                    }
                    : {
                        mode: 'fixed',
                        extraAmount: Number(editForm.commissionSettings.extraAmount) || 0,
                        extraCurrency: editForm.commissionSettings.extraCurrency
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
            if (error.code === 'SALE_HAS_ACTIVE_INSTALLMENT_PLAN' && planActions) {
                try {
                    const preview = await planActions.preview();
                    setPlanCancel({ preview, reason: '', busy: false });
                } catch (previewError) {
                    toast.error(previewError.message);
                }
            }
            toast.error(error.message || 'Error desconocido al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmPlanCancel = async () => {
        if (!planActions || !planCancel) return;
        if ((planCancel.reason || '').trim().length < 5) {
            toast.error('Indicá el motivo de la cancelación (mínimo 5 caracteres).');
            return;
        }
        setPlanCancel(prev => ({ ...prev, busy: true }));
        try {
            await planActions.cancel({
                reason: planCancel.reason.trim(),
                installmentIds: planCancel.preview.cancellable.map(i => i._id)
            });
            toast.success('Plan de cuotas cancelado. Las cuotas quedaron anuladas (no se borraron). Ya podés guardar la venta como contado.');
            setPlanCancel(null);
        } catch (err) {
            toast.error(err.message);
            setPlanCancel(prev => ({ ...prev, busy: false }));
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
                {planCancel && (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                            <AlertCircle size={16} />
                            <span>Esta venta tiene un plan de cuotas activo</span>
                        </div>
                        {planCancel.preview.blocked ? (
                            <p className="m-0 text-amber-100">{planCancel.preview.blockedReason}</p>
                        ) : (
                            <>
                                <p className="m-0 text-amber-100/90">
                                    Para pasar la venta a contado hay que cancelar el plan. Se anularán (no se borran) estas {planCancel.preview.cancellable.length} cuota(s):
                                </p>
                                <ul className="m-0 max-h-32 list-none overflow-auto p-0 text-amber-100">
                                    {planCancel.preview.cancellable.map(i => (
                                        <li key={i._id} className="flex justify-between border-b border-amber-500/10 py-0.5">
                                            <span>Cuota {i.installmentNumber} · vence {new Date(i.dueDate).toLocaleDateString('es-AR')} · {i.status}</span>
                                            <span className="font-bold">{formatMoney(i.amount, i.currency)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="font-bold text-amber-200">
                                    Total que dejará de ser exigible: {Object.entries(planCancel.preview.totalsByCurrency).map(([cur, total]) => formatMoney(total, cur)).join(' + ')}
                                </div>
                                <textarea
                                    value={planCancel.reason}
                                    onChange={(e) => setPlanCancel(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Motivo de la cancelación del plan (obligatorio)"
                                    className="min-h-[56px] rounded-lg border border-amber-500/30 bg-crm-bg p-2 text-xs text-crm-fg"
                                />
                            </>
                        )}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setPlanCancel(null)} disabled={planCancel.busy} className="rounded-lg border border-neutral-700 bg-crm-bg px-3 py-1.5 font-bold text-crm-fg-muted">
                                Cerrar
                            </button>
                            {!planCancel.preview.blocked && (
                                <button type="button" onClick={handleConfirmPlanCancel} disabled={planCancel.busy} className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 font-bold text-amber-200 disabled:opacity-50">
                                    {planCancel.busy ? 'Cancelando...' : 'Confirmar cancelación del plan'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
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

                        {/* Selector de Modalidad: Por Valor de Cuota o Por % de Interés */}
                        <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2">
                            <span className="text-xs font-bold text-crm-fg-muted">Cargar plan según:</span>
                            <div className="flex rounded-lg border border-neutral-800 bg-crm-bg p-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditForm(prev => ({
                                            ...prev,
                                            calculationMode: 'by_installment',
                                            customInstallmentAmount: prev.customInstallmentAmount || (liveFinancing.installmentAmount > 0 ? liveFinancing.installmentAmount : '')
                                        }));
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                        editForm.calculationMode === 'by_installment'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'text-crm-fg-muted hover:text-white'
                                    }`}
                                >
                                    Valor de cuota ($)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditForm(prev => ({
                                            ...prev,
                                            calculationMode: 'by_rate',
                                            interestRate: prev.interestRate !== undefined ? prev.interestRate : liveFinancing.interestRate
                                        }));
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                        editForm.calculationMode === 'by_rate'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'text-crm-fg-muted hover:text-white'
                                    }`}
                                >
                                    % de interés
                                </button>
                            </div>
                        </div>

                        {/* Cantidad de Cuotas y Cuota / Interés */}
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

                            {editForm.calculationMode === 'by_installment' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-crm-fg-muted">
                                            Valor de cada cuota *
                                        </label>
                                        <span className="text-[10px] text-purple-300 font-semibold">
                                            Saca el % solo
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-2 text-xs font-bold text-crm-fg-muted">$</span>
                                        <CrmInput 
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={editForm.customInstallmentAmount}
                                            onChange={(e) => setEditForm({...editForm, customInstallmentAmount: e.target.value})}
                                            disabled={liveFinancing.financedBalance <= 0}
                                            placeholder="Ej: 800000"
                                            className="h-9 bg-crm-surface font-bold text-white pl-6"
                                        />
                                    </div>
                                </div>
                            ) : (
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
                            )}
                        </div>

                        {/* Aclaración obligatoria según requerimiento */}
                        <p className="m-0 text-[11px] text-purple-300/80 leading-normal bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                            <strong>Aclaración:</strong> Interés total sobre el saldo financiado; no es una tasa mensual.
                        </p>

                        {/* RESULTADOS EN VIVO DE LA FINANCIACIÓN */}
                        <div className="rounded-xl border border-neutral-700 bg-crm-bg p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
                                    Previsualización de Cálculos
                                </span>
                                {editForm.calculationMode === 'by_installment' && (
                                    <span className="text-[10px] text-emerald-400 font-bold">
                                        Tasa calculada: {liveFinancing.interestRate}%
                                    </span>
                                )}
                            </div>
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
                <div className="grid grid-cols-1 gap-3">
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
                </div>

                {/* COMISIÓN */}
                <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Comisión</span>
                        {isEditing && (
                            <div className="flex rounded-lg border border-neutral-800 bg-crm-surface p-0.5">
                                {[['fixed', 'Importe fijo'], ['percent', 'Porcentaje']].map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setEditForm(prev => ({ ...prev, commissionSettings: { ...prev.commissionSettings, mode } }))}
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                            editForm.commissionSettings.mode === mode
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : 'text-crm-fg-muted hover:text-white'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {isEditing && isPercentEdit && (
                        <div className="flex flex-col gap-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-crm-fg-muted">Porcentaje de comisión (%)</label>
                                <div className="relative">
                                    <CrmInput
                                        type="number"
                                        step="any"
                                        min="0"
                                        max="100"
                                        value={editForm.commissionSettings.percent}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, commissionSettings: { ...prev.commissionSettings, percent: e.target.value } }))}
                                        placeholder="Ej: 1,3"
                                        className="h-8 bg-crm-surface px-2 pr-7 text-xs font-bold text-right"
                                    />
                                    <span className="absolute right-2.5 top-1.5 text-xs font-bold text-crm-fg-muted">%</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-crm-fg-muted">Base de cálculo (precio total pactado de la venta)</span>
                                <span className="font-bold text-white">{formatMoney(livePrice, editForm.saleCurrency)}</span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-crm-border pt-1.5">
                                <span className="text-crm-fg-muted">Importe de comisión</span>
                                <span className="font-black text-emerald-300">{formatMoney(liveCommission.amount, liveCommission.currency)}</span>
                            </div>
                            <span className="text-[10px] text-crm-fg-muted leading-snug">
                                Comisión = precio total × % / 100. En ventas financiadas la base es el total de la operación (entrega + cuotas), sin sumar entrega, cuotas o permutas por separado. Guardarla no la marca como pagada ni genera un egreso.
                            </span>
                        </div>
                    )}

                    {isEditing && !isPercentEdit && (
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
                    )}

                    {!isEditing && (
                        sale.commissionSettings?.mode === 'percent' ? (
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-crm-fg-muted">Porcentaje</span>
                                    <span className="font-bold text-crm-fg">{String(sale.commissionSettings.percent ?? 0).replace('.', ',')}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-crm-fg-muted">Base (precio total pactado)</span>
                                    <span className="font-bold text-crm-fg">{formatMoney(sale.salePrice || 0, sale.saleCurrency || 'ARS')}</span>
                                </div>
                                <div className="flex justify-between border-t border-crm-border pt-1">
                                    <span className="text-crm-fg-muted">Importe de comisión</span>
                                    <span className="text-sm font-bold text-crm-fg">{formatMoney(sale.commissionSettings.extraAmount, sale.commissionSettings.extraCurrency || sale.saleCurrency)}</span>
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
                                {sale.commissionSettings?.extraAmount > 0 && (
                                    <span className="block text-[10px] text-crm-fg-muted">Importe fijo</span>
                                )}
                            </div>
                        )
                    )}
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
                {canViewCostAndProfit ? (
                    <div className={`flex flex-col gap-2 rounded-xl border p-4 mt-2 ${liveProfit.calculable ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-[0.08em] ${liveProfit.calculable ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    Ganancia de la Operación
                                </span>
                                <span className="text-[10px] text-crm-fg-muted mt-0.5">
                                    (Precio total pactado − Compra/toma − Gastos del vehículo − Gastos comerciales − Comisión)
                                </span>
                            </div>
                            <span className={`text-lg font-black text-right ${liveProfit.calculable ? (liveProfit.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-amber-300'}`}>
                                {liveProfit.calculable
                                    ? formatMoney(liveProfit.netProfit, liveProfit.currency)
                                    : 'Ganancia no calculable'}
                            </span>
                        </div>

                        {!liveProfit.calculable && liveProfit.missingReasons?.length > 0 && (
                            <div className="mt-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-[11px] text-amber-200">
                                <div className="font-bold text-amber-300 mb-1">Ganancia no calculable — Dato(s) faltante(s):</div>
                                <ul className="m-0 pl-4 space-y-0.5">
                                    {liveProfit.missingReasons.map((reason, idx) => (
                                        <li key={idx}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-1 flex flex-col gap-1.5 border-t border-white/10 pt-2.5 text-[11px] text-crm-fg-secondary">
                            <div className="flex justify-between">
                                <span>Precio total pactado</span>
                                <span className="font-bold text-white">
                                    {liveProfit.agreedPrice !== null ? formatMoney(liveProfit.agreedPrice, liveProfit.currency) : 'Dato faltante'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>
                                    − Compra/toma
                                    {liveProfit.acquisitionSource === 'valor_de_toma' ? ' (valor de toma)' : ''}
                                </span>
                                <span className="font-bold text-white">
                                    {liveProfit.acquisitionCost !== null
                                        ? `− ${formatMoney(liveProfit.acquisitionCost, liveProfit.currency)}`
                                        : (liveProfit.rawAcquisitionCost !== null
                                            ? `${formatMoney(liveProfit.rawAcquisitionCost, liveProfit.rawAcquisitionCurrency)} (falta conversión)`
                                            : 'Dato faltante')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>− Gastos del vehículo</span>
                                <span className="font-bold text-white">
                                    {liveProfit.excludedVehicleExpensesCount > 0 && !liveProfit.exchangeRateUsed
                                        ? `− ${formatMoney(liveProfit.vehicleExpensesTotal, liveProfit.currency)} (+${liveProfit.excludedVehicleExpensesCount} sin conversión)`
                                        : `− ${formatMoney(liveProfit.vehicleExpensesTotal, liveProfit.currency)}`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>− Gastos comerciales</span>
                                <span className="font-bold text-white">
                                    {liveProfit.excludedSaleExpensesCount > 0 && !liveProfit.exchangeRateUsed
                                        ? `− ${formatMoney(liveProfit.saleExpensesTotal, liveProfit.currency)} (+${liveProfit.excludedSaleExpensesCount} sin conversión)`
                                        : `− ${formatMoney(liveProfit.saleExpensesTotal, liveProfit.currency)}`}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-1">
                                <span>Ganancia antes de comisión</span>
                                <span className="font-bold text-white">
                                    {liveProfit.calculable
                                        ? formatMoney(liveProfit.profitBeforeCommission, liveProfit.currency)
                                        : 'Ganancia no calculable'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>
                                    − Comisión
                                    {liveProfit.commissionMode === 'percent' && liveProfit.commissionPercent !== null
                                        ? ` (${liveProfit.commissionPercent}%)`
                                        : ''}
                                </span>
                                <span className="font-bold text-white">
                                    {liveProfit.commissionComparable
                                        ? `− ${formatMoney(liveProfit.commissionAmount, liveProfit.currency)}`
                                        : `${formatMoney(liveProfit.rawCommissionAmount, liveProfit.rawCommissionCurrency)} (falta conversión)`}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-white/15 pt-1.5 text-xs">
                                <span className="font-bold text-white">= Ganancia neta de la operación</span>
                                <span className={`font-black ${liveProfit.calculable ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    {liveProfit.calculable
                                        ? formatMoney(liveProfit.netProfit, liveProfit.currency)
                                        : 'Ganancia no calculable'}
                                </span>
                            </div>
                            {liveProfit.calculable && liveProfit.investorPercentage > 0 && (
                                <div className="mt-1 flex flex-col gap-0.5 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px]">
                                    <div className="flex justify-between">
                                        <span>Participación socio ({liveProfit.investorPercentage}%)</span>
                                        <span className="font-bold text-amber-200">{formatMoney(liveProfit.partnerNetProfit, liveProfit.currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-bold text-emerald-200">Ganancia neta agencia ({liveProfit.agencySharePercentage}%)</span>
                                        <span className="font-bold text-emerald-300">{formatMoney(liveProfit.agencyNetProfit, liveProfit.currency)}</span>
                                    </div>
                                </div>
                            )}
                            {liveProfit.exchangeRateUsed && (
                                <div className="text-[10px] text-emerald-200/80">
                                    Conversión aplicada y registrada: 1 USD = {formatMoney(liveProfit.exchangeRateUsed, 'ARS')}.
                                </div>
                            )}
                        </div>

                        {/* Cotización USD/ARS para operaciones multimoneda */}
                        {(isEditing || !liveProfit.costComparable || !liveProfit.commissionComparable || liveProfit.excludedExpensesCount > 0 || sale.exchangeRate > 0) && (
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px]">
                                <span className="text-crm-fg-muted">
                                    Cotización registrada (ARS por 1 USD):
                                </span>
                                {isEditing ? (
                                    <CrmInput
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="Ej: 1200"
                                        value={editForm.exchangeRate}
                                        onChange={(e) => setEditForm({ ...editForm, exchangeRate: e.target.value })}
                                        className="h-7 w-32 bg-crm-bg px-2 text-xs text-right font-bold"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CrmInput
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder={sale.exchangeRate ? String(sale.exchangeRate) : 'Cotización USD/ARS'}
                                            value={previewExchangeRate}
                                            onChange={(e) => setPreviewExchangeRate(e.target.value)}
                                            className="h-7 w-36 bg-crm-bg px-2 text-xs text-right font-bold"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DISTINCIÓN EXPLÍCITA ENTRE GANANCIA DE LA OPERACIÓN Y DINERO EFECTIVAMENTE COBRADO */}
                        <div className="mt-1 flex flex-col gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2.5 text-[11px] text-sky-100">
                            <div className="flex justify-between">
                                <span className="font-bold text-sky-300">Dinero efectivamente cobrado</span>
                                <span className="font-black text-white">
                                    {formatMoney(sale.finance?.netoCobrado || 0, sale.saleCurrency || 'ARS')}
                                </span>
                            </div>
                            {Number(sale.tradeInTotalAmount) > 0 && (
                                <div className="flex justify-between text-purple-200">
                                    <span>Capital recibido en permuta (vehículo tomado, no es efectivo)</span>
                                    <span className="font-bold">{formatMoney(sale.tradeInTotalAmount, sale.saleCurrency || 'ARS')}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sky-200/80">
                                <span>Saldo pendiente de cobro</span>
                                <span className="font-bold">
                                    {formatMoney(Math.max(0, sale.finance?.pendingBalance ?? ((sale.salePrice || 0) - (sale.tradeInTotalAmount || 0) - (sale.finance?.netoCobrado || 0))), sale.saleCurrency || 'ARS')}
                                </span>
                            </div>
                            <span className="text-[10px] text-sky-200/75 mt-0.5">
                                La ganancia de la operación mide el resultado económico total pactado y no equivale al dinero disponible hoy en caja.
                            </span>
                        </div>

                        {isSaleFinanced && hasExistingFinancing && (
                            <div className="mt-1 border-t border-white/10 pt-2 text-[11px] text-emerald-200/80 leading-relaxed">
                                <p className="m-0">
                                    <strong>Flujo de caja:</strong> Las cuotas pendientes ({formatMoney(sale.financingDetails.totalFinancedWithInterest, sale.saleCurrency)}) y el interés pactado ({formatMoney(sale.financingDetails.interestAmount, sale.saleCurrency)}) corresponden a ganancia proyectada en el tiempo y <strong>no constituyen efectivo disponible en caja</strong> hasta su cobro efectivo.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 rounded-xl border border-crm-border bg-crm-bg/60 p-3 mt-2 text-xs text-crm-fg-muted">
                        <span className="font-bold text-crm-fg-secondary">Costos y ganancia restringidos</span>
                        <span>Tu perfil no cuenta con permisos financieros para visualizar costos de adquisición ni márgenes de ganancia.</span>
                    </div>
                )}

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
