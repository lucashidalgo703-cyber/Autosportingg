/**
 * Utilidades para el cálculo y conciliación patrimonial del pago de compra de unidades.
 * Soporta adquisiciones propias directas y adquisiciones en co-inversión / a medias con empresas asociadas.
 * Garantiza consistencia entre fichas de stock, tesorería y administración financiera.
 */

export const LOADED_COMPANIES = ['LHIVER', 'AUTOTERRA', 'AKAR', 'ALWAYS SAS'];

export function getCarPurchasePaymentSummary(car) {
    if (!car) return null;

    const state = car.purchasePaymentState || {};

    const isSharedInvestment = Boolean(
        state.isSharedInvestment ||
        (car.investor && Number(car.investor.percentage) > 0) ||
        car.origen === 'compartido' ||
        car.isSharedInvestment
    );

    const isAgencyOwned = Boolean(
        car.agencyOwned || 
        car.origen === 'propio' || 
        car.origin === 'propio' ||
        isSharedInvestment ||
        (!car.investor && !car.consignedBy && !car.consignador && car.agencyOwned !== false)
    );

    if (!isAgencyOwned && car.origen !== 'propio' && !isSharedInvestment) {
        return {
            isAgencyOwned: false,
            isSharedInvestment: false,
            status: 'no_aplica',
            statusLabel: 'No aplica (Consignación / Tercero)',
            totalCost: 0,
            amountPaid: 0,
            pendingDebt: 0,
            agencyCost: 0,
            partnerContribution: 0,
            partnerPercentage: 0,
            agencyPercentage: 100,
            partnerCompany: '',
            currency: 'USD',
            payments: [],
            commitAuditLog: []
        };
    }

    const cost = Number(car.purchasePrice ?? car.precioCompra ?? state.totalCost ?? 0);
    const rawCurrency = car.purchaseCurrency || car.monedaCompra || car.currency || car.moneda;
    const currency = ((rawCurrency === 'USD' || rawCurrency === 'U$S') && cost > 200000) ? 'ARS' : (rawCurrency === 'ARS' ? 'ARS' : (rawCurrency || 'USD'));

    const partnerPercentage = isSharedInvestment 
        ? Math.min(99, Math.max(1, Number(state.partnerPercentage || car.investor?.percentage || 50)))
        : 0;
    const partnerCompany = state.partnerCompany || car.investor?.name || '';
    const agencyPercentage = isSharedInvestment ? Math.max(0, 100 - partnerPercentage) : 100;

    const agencyCost = isSharedInvestment ? Math.round(cost * (agencyPercentage / 100)) : cost;
    const partnerContribution = isSharedInvestment ? (cost - agencyCost) : 0;

    const payments = Array.isArray(state.payments) ? state.payments : [];
    const sumValidPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const recordedPaid = Number(state.amountPaid) || 0;
    const amountPaid = payments.length > 0 ? sumValidPayments : recordedPaid;

    const rawModality = state.modality;
    const rawStatus = state.status;

    // Detectar si es un vehículo histórico sin información suficiente
    const hasExplicitPaymentFlow = rawStatus === 'pendiente' || 
                                   rawStatus === 'parcial' || 
                                   rawStatus === 'pagado' ||
                                   rawModality === 'pendiente' || 
                                   rawModality === 'pagar_ahora' || 
                                   rawModality === 'pago_parcial' ||
                                   rawModality === 'vinculado_egreso' ||
                                   payments.length > 0;

    // Si es histórico sin datos suficientes
    if (!hasExplicitPaymentFlow || rawStatus === 'conciliacion_pendiente') {
        return {
            isAgencyOwned: true,
            isHistorical: true,
            isSharedInvestment,
            partnerCompany,
            partnerPercentage,
            agencyPercentage,
            agencyCost,
            partnerContribution,
            status: 'conciliacion_pendiente',
            statusLabel: 'Pago pendiente de conciliación',
            totalCost: cost,
            amountPaid: 0,
            pendingDebt: 0, // No inventar deuda retroactiva
            currency,
            modality: 'ya_pagado_historico',
            payments: [],
            expectedDate: state.expectedDate || null,
            expectedFundsNote: state.expectedFundsNote || '',
            commitNotes: state.commitNotes || '',
            commitAuditLog: state.commitAuditLog || []
        };
    }

    // Deuda pendiente calculada según el compromiso propio de la agencia
    // En una inversión a medias, el aporte del socio ya está cubierto, por lo que la agencia
    // solo adeuda su cuota propia. Al pagar su cuota, NO QUEDA SALDO PENDIENTE.
    let pendingDebt = Math.max(0, agencyCost - amountPaid);
    let status;

    if (rawStatus === 'pagado' || (agencyCost > 0 && amountPaid >= agencyCost)) {
        pendingDebt = 0;
        status = 'pagado';
    } else if (rawStatus === 'parcial' || (amountPaid > 0 && amountPaid < agencyCost)) {
        status = 'parcial';
    } else {
        // Impago explícito del compromiso propio
        status = 'pendiente';
        pendingDebt = agencyCost > 0 ? (agencyCost - amountPaid) : 0;
    }

    const statusLabel = status === 'pagado'
        ? (isSharedInvestment 
            ? (partnerCompany ? `Pagado (Inversión a medias con ${partnerCompany})` : `Pagado (Inversión a medias ${partnerPercentage}%)`)
            : 'Pagado / Liquidado')
        : status === 'parcial'
            ? 'Pago Parcial'
            : status === 'conciliacion_pendiente'
                ? 'Pago pendiente de conciliación'
                : 'Pendiente de Pago';

    return {
        isAgencyOwned: true,
        isHistorical: false,
        isSharedInvestment,
        partnerCompany,
        partnerPercentage,
        agencyPercentage,
        agencyCost,
        partnerContribution,
        status,
        statusLabel,
        totalCost: cost,
        amountPaid,
        pendingDebt,
        currency,
        modality: rawModality || (status === 'pagado' ? 'pagar_ahora' : 'pendiente'),
        payments,
        expectedDate: state.expectedDate || null,
        expectedFundsNote: state.expectedFundsNote || '',
        commitNotes: state.commitNotes || '',
        commitAuditLog: state.commitAuditLog || []
    };
}
