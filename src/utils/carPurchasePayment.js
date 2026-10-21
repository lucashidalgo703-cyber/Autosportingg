/**
 * Utilidades para el cálculo y conciliación patrimonial del pago de compra de unidades.
 * Garantiza consistencia entre fichas de stock, tesorería y administración financiera.
 */

export function getCarPurchasePaymentSummary(car) {
    if (!car) return null;

    const isAgencyOwned = Boolean(
        car.agencyOwned || 
        car.origen === 'propio' || 
        car.origin === 'propio' ||
        (!car.investor && !car.consignedBy && !car.consignador && car.agencyOwned !== false)
    );

    if (!isAgencyOwned && car.origen !== 'propio') {
        return {
            isAgencyOwned: false,
            status: 'no_aplica',
            statusLabel: 'No aplica (Consignación / Tercero)',
            totalCost: 0,
            amountPaid: 0,
            pendingDebt: 0,
            currency: 'USD',
            payments: [],
            commitAuditLog: []
        };
    }

    const state = car.purchasePaymentState || {};
    const cost = Number(car.purchasePrice ?? car.precioCompra ?? state.totalCost ?? 0);
    const rawCurrency = car.purchaseCurrency || car.monedaCompra || car.currency || car.moneda;
    const currency = ((rawCurrency === 'USD' || rawCurrency === 'U$S') && cost > 200000) ? 'ARS' : (rawCurrency === 'ARS' ? 'ARS' : (rawCurrency || 'USD'));

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

    // Si la compra está registrada en el circuito:
    let pendingDebt = Math.max(0, cost - amountPaid);
    let status;

    if (rawStatus === 'pagado' || (cost > 0 && amountPaid >= cost)) {
        pendingDebt = 0;
        status = 'pagado';
    } else if (rawStatus === 'parcial' || (amountPaid > 0 && amountPaid < cost)) {
        status = 'parcial';
    } else {
        // Impago explícito (ej: Costo 20.646.000, Abonado 0 -> Pendiente 20.646.000)
        status = 'pendiente';
        pendingDebt = cost > 0 ? cost - amountPaid : 0;
    }

    const statusLabel = status === 'pagado'
        ? 'Pagado / Liquidado'
        : status === 'parcial'
            ? 'Pago Parcial'
            : status === 'conciliacion_pendiente'
                ? 'Pago pendiente de conciliación'
                : 'Pendiente de Pago';

    return {
        isAgencyOwned: true,
        isHistorical: false,
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
