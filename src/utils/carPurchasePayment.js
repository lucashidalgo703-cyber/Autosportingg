import { stockValuation } from './inventoryStock.js';
import { parseArgentineMoney, roundMoney } from './saleCommercial.js';

export const LOADED_COMPANIES = ['LHIVER', 'AUTOTERRA', 'AKAR', 'ALWAYS SAS'];

// Purchase-payment information shares the same ownership and acquisition source
// as inventory. Currency never changes because an amount looks unusually large.
export function getCarPurchasePaymentSummary(car) {
    if (!car) return null;
    const original = car._original || (typeof car.toObject === 'function' ? car.toObject() : car);
    const state = original.purchasePaymentState || car.purchasePaymentState || {};
    const canonical = { ...original, purchasePrice: original.purchasePrice ?? car.precioCompra,
        purchaseCurrency: original.purchaseCurrency ?? car.monedaCompra, currency: original.currency ?? car.moneda,
        price: original.price ?? car.precioPublicado, origen: original.origen ?? car.origen };
    const value = stockValuation(canonical);
    const isAgencyOwned = !['consignacion', 'tercero'].includes(value.type);
    const isSharedInvestment = ['compartido', 'inversor'].includes(value.type) || value.type === 'sin_definir';
    const partnerCompany = value.investorName || state.partnerCompany || '';
    const common = { isAgencyOwned, isSharedInvestment, partnerCompany,
        partnerPercentage: value.investorPct, agencyPercentage: value.ownPct,
        currency: value.purchaseCurrency, expectedDate: state.expectedDate || null,
        expectedFundsNote: state.expectedFundsNote || '', commitNotes: state.commitNotes || '', commitAuditLog: state.commitAuditLog || [] };
    if (!isAgencyOwned) return { ...common, status: 'no_aplica', statusLabel: 'No aplica (Consignación / Mandato)',
        totalCost: 0, amountPaid: 0, pendingDebt: 0, agencyCost: 0, partnerContribution: 0, payments: [], calculationPending: false };
    const missingFields = value.missingFields.filter(item => item.scope === 'ownership' || ['purchasePrice', 'purchaseCurrency', 'capitalAgreement'].includes(item.field));
    const cost = value.purchase;
    const agencyCost = value.acquisitionSplit?.own ?? null;
    const partnerContribution = value.acquisitionSplit?.investor ?? null;
    if (missingFields.length || cost === null || agencyCost === null || partnerContribution === null) return {
        ...common, calculationPending: true, missingFields, isHistorical: true,
        status: 'conciliacion_pendiente', statusLabel: 'Datos de compra pendientes de verificar', totalCost: cost,
        agencyCost, partnerContribution, amountPaid: null, pendingDebt: null, payments: [], modality: state.modality || 'ya_pagado_historico'
    };
    const payments = Array.isArray(state.payments) ? state.payments : [];
    const parsedPaid = parseArgentineMoney(state.amountPaid);
    const amountPaid = payments.length ? roundMoney(payments.reduce((sum, payment) => {
        const amount = parseArgentineMoney(payment.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0)) : Number.isFinite(parsedPaid) ? roundMoney(parsedPaid) : 0;
    const hasExplicitPaymentFlow = ['pendiente', 'parcial', 'pagado'].includes(state.status)
        || ['pendiente', 'pagar_ahora', 'pago_parcial', 'vinculado_egreso'].includes(state.modality) || payments.length > 0;
    if (!hasExplicitPaymentFlow || state.status === 'conciliacion_pendiente') return {
        ...common, calculationPending: false, missingFields: [], isHistorical: true,
        agencyCost, partnerContribution, status: 'conciliacion_pendiente', statusLabel: 'Pago pendiente de conciliación',
        totalCost: cost, amountPaid: 0, pendingDebt: 0, modality: 'ya_pagado_historico', payments: []
    };
    let pendingDebt = Math.max(0, roundMoney(agencyCost - amountPaid));
    const status = state.status === 'pagado' || agencyCost === 0 || (agencyCost > 0 && amountPaid >= agencyCost) ? 'pagado'
        : state.status === 'parcial' || amountPaid > 0 ? 'parcial' : 'pendiente';
    if (status === 'pagado') pendingDebt = 0;
    const statusLabel = status === 'pagado' ? (isSharedInvestment ? `Pagado (Participación inversor ${value.investorPct}%${partnerCompany ? ` · ${partnerCompany}` : ''})` : 'Pagado / Liquidado')
        : status === 'parcial' ? 'Pago Parcial' : 'Pendiente de Pago';
    return { ...common, calculationPending: false, missingFields: [], isHistorical: false,
        agencyCost, partnerContribution, status, statusLabel, totalCost: cost, amountPaid, pendingDebt,
        modality: state.modality || (status === 'pagado' ? 'pagar_ahora' : 'pendiente'), payments };
}
