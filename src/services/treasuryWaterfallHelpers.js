import {
    computeSaleProfit,
    resolveVehicleAcquisitionCost,
    roundMoney
} from '../utils/saleCommercial.js';

/**
 * Calcula el estado de inversión real, capital propio vs terceros, costos pendientes,
 * capital en permuta, capital recuperado en efectivo y objetivo de extra de reinversión
 * para una operación de venta (Sale).
 */
export function computeOperationRecoveryState({
    sale,
    vehicle = null,
    legacyOrigin = null,
    saleTransactions = [],
    paidSettlements = [],
    config = {},
    excludeTransactionId = null
}) {
    const resolvedVehicle = vehicle || (sale?.vehicleId && typeof sale.vehicleId === 'object' ? sale.vehicleId : null);
    const saleCurrency = sale?.saleCurrency === 'USD' ? 'USD' : 'ARS';
    const agreedPrice = roundMoney(Number(sale?.salePrice || 0));
    const exchangeRate = Number(sale?.exchangeRate || 0) > 0 ? Number(sale.exchangeRate) : null;

    const profitability = computeSaleProfit({
        salePrice: agreedPrice,
        saleCurrency,
        vehicle: resolvedVehicle,
        legacyTradeInOrigin: legacyOrigin,
        vehicleExpenses: resolvedVehicle?.expenses || [],
        saleExpenses: sale?.saleExpenses || [],
        commissionAmount: sale?.commissionAmount ?? sale?.commissionSettings?.totalCommissionAmount,
        commissionCurrency: sale?.commissionCurrency,
        commissionSettings: sale?.commissionSettings,
        exchangeRate
    });

    // Determinar participación propia vs socio/comitente
    let partnerPct = 0;
    let isConsignment = false;
    let thirdPartyOwner = null;

    if (resolvedVehicle) {
        const invPct = Number(
            (resolvedVehicle.investor && resolvedVehicle.investor.percentage > 0 ? resolvedVehicle.investor.percentage : 0) ||
            (resolvedVehicle.jointOwnership && resolvedVehicle.jointOwnership.hasPartner && resolvedVehicle.jointOwnership.partnerPercentage > 0
                ? resolvedVehicle.jointOwnership.partnerPercentage
                : 0)
        );
        if (invPct > 0) {
            partnerPct = Math.min(100, Math.max(0, invPct));
            thirdPartyOwner = resolvedVehicle.investor?.name || resolvedVehicle.jointOwnership?.partnerName || 'Socio Inversor';
        } else if (resolvedVehicle.consignedBy || (resolvedVehicle.agencyOwned === false && resolvedVehicle.ownerName)) {
            isConsignment = true;
            thirdPartyOwner = resolvedVehicle.consignedBy || resolvedVehicle.ownerName || 'Comitente';
        }
    } else if (sale && (sale.vehicleOwnerName || sale.ownerName || sale.consignationOwnerId)) {
        isConsignment = true;
        thirdPartyOwner = sale.vehicleOwnerName || sale.ownerName || 'Propietario Comitente';
    }

    const agencyPct = isConsignment ? 0 : roundMoney(100 - partnerPct);

    // Transacciones activas de la operación
    const activeTxs = (saleTransactions || []).filter(
        (t) => t && (t.status === 'activo' || t.status === 'Completado') && t.currency === saleCurrency
    );
    const pendingExpenseTxs = (saleTransactions || []).filter(
        (t) => t && t.type === 'Egreso' && t.status === 'pendiente' && t.currency === saleCurrency
    );

    // Dinero efectivamente cobrado (NUNCA incluye permutas; evita duplicar seña si ya hay transacción de ingreso por seña)
    const incomeTxs = activeTxs.filter((t) => t.type === 'Ingreso');
    let incomeTxsSum = 0;
    let hasDepositTx = false;
    for (const t of incomeTxs) {
        incomeTxsSum = roundMoney(incomeTxsSum + Number(t.amount || 0));
        if (t.source === 'reserva' || /seña|reserva/i.test(t.concept || t.description || '')) {
            hasDepositTx = true;
        }
    }
    const depositApplied = (sale?.depositAppliedCurrency === saleCurrency && Number(sale?.depositAppliedAmount) > 0 && !hasDepositTx)
        ? roundMoney(Number(sale.depositAppliedAmount))
        : 0;
    const effectivelyCollectedCash = roundMoney(incomeTxsSum + depositApplied);

    // Permutas recibidas (capital en otro vehículo, NO ingreso de efectivo)
    let tradeInCapitalInVehicles = roundMoney(Number(sale?.tradeInTotalAmount || 0));
    if (tradeInCapitalInVehicles === 0 && Array.isArray(sale?.tradeIns) && sale.tradeIns.length > 0) {
        for (const ti of sale.tradeIns) {
            const tiCurr = ti.currency === 'USD' ? 'USD' : 'ARS';
            const val = Number(ti.estimatedValue || 0);
            if (val > 0) {
                if (tiCurr === saleCurrency) {
                    tradeInCapitalInVehicles = roundMoney(tradeInCapitalInVehicles + val);
                } else if (exchangeRate && exchangeRate > 0) {
                    const conv = tiCurr === 'USD' && saleCurrency === 'ARS' ? val * exchangeRate : val / exchangeRate;
                    tradeInCapitalInVehicles = roundMoney(tradeInCapitalInVehicles + conv);
                }
            }
        }
    }

    // Acumulados ya distribuidos en cobros previos de esta operación
    let alreadyReservedPendingCosts = 0;
    let alreadyRecoveredCapital = 0;
    let alreadyAllocatedExtraReinvestment = 0;
    let alreadyReturnedThirdPartyCapital = 0;
    let alreadyReturnedThirdPartyProfit = 0;
    let alreadyDistributedOwnTotal = 0;
    let alreadyDistributedMargin = 0;
    let pendingDistributionAmount = 0;

    for (const t of incomeTxs) {
        if (excludeTransactionId && String(t._id) === String(excludeTransactionId)) continue;
        const txOwnAmt = roundMoney(Math.max(0, Number(t.amount || 0) - Number(t.thirdPartyAmount || 0)));
        if (!t.isTreasuryDistributed || t.isTreasuryDistributionReversed) {
            pendingDistributionAmount = roundMoney(pendingDistributionAmount + txOwnAmt);
            continue;
        }

        const bd = t.treasuryBreakdown;
        if (bd && (bd.capitalRecoveredToStock !== undefined || bd.appliedAllocations?.length > 0 || bd.schemeKey)) {
            const txObligations = Number(bd.obligationsSeparated ?? bd.operationPendingCostsReserved ?? 0);
            alreadyReservedPendingCosts = roundMoney(alreadyReservedPendingCosts + txObligations);
            alreadyRecoveredCapital = roundMoney(alreadyRecoveredCapital + Number(bd.capitalRecoveredToStock || 0));
            alreadyAllocatedExtraReinvestment = roundMoney(alreadyAllocatedExtraReinvestment + Number(bd.extraReinvestmentToStock || 0));
            alreadyReturnedThirdPartyCapital = roundMoney(alreadyReturnedThirdPartyCapital + Number(bd.thirdPartyCapitalReturn || 0));
            alreadyReturnedThirdPartyProfit = roundMoney(alreadyReturnedThirdPartyProfit + Number(bd.thirdPartyProfitShare || 0));
            alreadyDistributedOwnTotal = roundMoney(alreadyDistributedOwnTotal + Number(bd.ownGrossAmount || 0));

            const txMarginDist = bd.marginDistributed !== undefined && Number(bd.marginDistributed) > 0
                ? Number(bd.marginDistributed)
                : roundMoney(
                    Number(bd.essentialShortfallsCovered || 0) +
                    Number(bd.reserveCovered || 0) +
                    Number(bd.extraReinvestmentToStock || 0) +
                    Number(bd.remainderDistributed || 0)
                );
            alreadyDistributedMargin = roundMoney(alreadyDistributedMargin + txMarginDist);

            const txPending = Number(bd.pendingDistributionAmount ?? bd.unassignedRemainder ?? 0);
            if (txPending > 0) {
                pendingDistributionAmount = roundMoney(pendingDistributionAmount + txPending);
            }
        }
    }

    const expectedCashTotal = roundMoney(Math.max(0, agreedPrice - tradeInCapitalInVehicles));
    const pendingSaleBalance = roundMoney(Math.max(0, expectedCashTotal - effectivelyCollectedCash));

    // Si la ganancia no es calculable (falta vehículo, falta compra/toma o falta tipo de cambio)
    if (!profitability.calculable) {
        return {
            saleId: sale?._id ? String(sale._id) : null,
            calculable: false,
            statusLabel: profitability.statusLabel || 'Ganancia no calculable',
            missingReasons: profitability.missingReasons || ['Faltan datos de costo para calcular la inversión y ganancia.'],
            saleCurrency,
            agreedPrice,
            expectedCashTotal,
            pendingSaleBalance,
            effectivelyCollectedCash,
            tradeInCapitalInVehicles,
            alreadyReservedPendingCosts,
            alreadyDistributedMargin,
            marginReleased: alreadyDistributedMargin,
            pendingDistributionAmount,
            agencyPct,
            partnerPct,
            isConsignment,
            thirdPartyOwner,
            realInvestmentTotal: null,
            ownPurchaseCost: null,
            ownRealInvestment: null,
            thirdPartyRealInvestment: null,
            pendingOperationCostsTotal: 0,
            remainingPendingCostsToReserve: 0,
            ownPaidInvestment: null,
            ownCashInvestmentToRecover: null,
            alreadyRecoveredCapital,
            remainingCapitalToRecover: null,
            reinvestmentExtraConfigured: Boolean(config?.reinvestmentExtraConfigured),
            reinvestmentExtraPct: config?.reinvestmentExtraConfigured ? Number(config.reinvestmentExtraPct ?? 0) : null,
            extraReinvestmentTarget: null,
            alreadyAllocatedExtraReinvestment,
            remainingExtraReinvestmentTarget: null,
            reportedNetProfit: null,
            profitability
        };
    }

    const purchaseCost = roundMoney(Number(profitability.acquisitionCost ?? profitability.purchaseCostInSaleCurrency ?? 0));
    const vehicleExpensesTotal = roundMoney(Number(profitability.vehicleExpensesTotal || 0));
    const saleExpensesTotal = roundMoney(Number(profitability.saleExpensesTotal || 0));
    const commissionAmount = roundMoney(Number(profitability.commissionAmount || 0));
    const reportedNetProfit = roundMoney(Number(profitability.netProfit || 0));

    // Inversión real total (compra/toma + gastos atribuibles del vehículo + gastos comerciales, sin duplicar)
    const realInvestmentTotal = roundMoney(purchaseCost + vehicleExpensesTotal + saleExpensesTotal);

    // Detectar costos de la operación pendientes de pago (para reservarlos en Paso 1 y NO mandarlos a Stock)
    let unpaidEmbeddedExpenses = 0;
    const convertExpToSaleCurr = (amt, curr) => {
        const n = Number(amt || 0);
        if (n <= 0) return 0;
        const c = curr === 'USD' ? 'USD' : 'ARS';
        if (c === saleCurrency) return roundMoney(n);
        if (!exchangeRate || exchangeRate <= 0) return 0;
        return roundMoney(c === 'USD' && saleCurrency === 'ARS' ? n * exchangeRate : n / exchangeRate);
    };

    for (const exp of resolvedVehicle?.expenses || []) {
        if (exp && (exp.status === 'pendiente' || exp.paid === false || exp.isPending === true)) {
            unpaidEmbeddedExpenses = roundMoney(unpaidEmbeddedExpenses + convertExpToSaleCurr(exp.amount, exp.currency || resolvedVehicle?.purchaseCurrency));
        }
    }
    for (const exp of sale?.saleExpenses || []) {
        if (exp && (exp.status === 'pendiente' || exp.paid === false || exp.isPending === true)) {
            unpaidEmbeddedExpenses = roundMoney(unpaidEmbeddedExpenses + convertExpToSaleCurr(exp.amount, exp.currency || saleCurrency));
        }
    }

    let pendingTxExpensesSum = 0;
    for (const ptx of pendingExpenseTxs) {
        pendingTxExpensesSum = roundMoney(pendingTxExpensesSum + Number(ptx.amount || 0));
    }

    // Evitar duplicar si un gasto pendiente está tanto embebido como en Transaction pendiente
    const unpaidExpensesTotal = roundMoney(Math.max(unpaidEmbeddedExpenses, pendingTxExpensesSum));

    // Verificar si la comisión de la venta ya fue pagada
    let commissionAlreadyPaid = Boolean(sale?.commissionPaid === true);
    if (!commissionAlreadyPaid && commissionAmount > 0) {
        const hasPaidCommTx = activeTxs.some(
            (t) => t.type === 'Egreso' && /comisi/i.test(`${t.category || ''} ${t.concept || ''} ${t.description || ''}`)
        );
        const hasPaidSettlement = (paidSettlements || []).some(
            (s) => s.status === 'pagada' && (s.includedSales || []).some((inc) => String(inc.saleId) === String(sale?._id))
        );
        commissionAlreadyPaid = hasPaidCommTx || hasPaidSettlement;
    }
    const unpaidCommission = commissionAlreadyPaid ? 0 : commissionAmount;

    // Total obligaciones específicas pendientes de la operación (gastos impagos + comisión impaga)
    const pendingOperationCostsTotal = roundMoney((unpaidExpensesTotal * (agencyPct / 100)) + unpaidCommission);
    const remainingPendingCostsToReserve = roundMoney(Math.max(0, pendingOperationCostsTotal - alreadyReservedPendingCosts));

    // Inversión propia vs terceros
    const ownRealInvestment = isConsignment
        ? 0
        : roundMoney(realInvestmentTotal * (agencyPct / 100));
    const thirdPartyRealInvestment = isConsignment
        ? roundMoney(Math.max(0, agreedPrice - commissionAmount))
        : roundMoney(realInvestmentTotal - ownRealInvestment);

    // Parte de la inversión propia ya pagada vs parte cubierta por vehículo tomado en permuta
    const ownUnpaidExpensesShare = roundMoney(unpaidExpensesTotal * (agencyPct / 100));
    const ownPaidInvestment = roundMoney(Math.max(0, ownRealInvestment - ownUnpaidExpensesShare));
    const ownTradeInCapitalShare = roundMoney(Math.min(ownPaidInvestment, tradeInCapitalInVehicles * (agencyPct / 100)));

    // Capital propio en efectivo que debe recuperarse en esta operación hacia Stock
    // (descuenta el capital que quedó representado en el auto tomado en permuta para no contarlo dos veces en la cadena)
    const ownCashInvestmentToRecover = roundMoney(Math.max(0, ownPaidInvestment - ownTradeInCapitalShare));
    const remainingCapitalToRecover = roundMoney(Math.max(0, ownCashInvestmentToRecover - alreadyRecoveredCapital));

    // Base de inversión propia para el Extra de Reinversión (%)
    // Se calcula estrictamente sobre el costo de compra correspondiente a la participación propia de la agencia.
    const ownPurchaseCost = isConsignment ? 0 : roundMoney(purchaseCost * (agencyPct / 100));
    const ownReinvestmentBase = ownPurchaseCost;
    const reinvestmentExtraConfigured = Boolean(
        config?.reinvestmentExtraConfigured &&
        config?.reinvestmentExtraPct !== null &&
        config?.reinvestmentExtraPct !== undefined &&
        Number.isFinite(Number(config.reinvestmentExtraPct)) &&
        Number(config.reinvestmentExtraPct) >= 0
    );
    const reinvestmentExtraPct = reinvestmentExtraConfigured ? Number(config.reinvestmentExtraPct) : null;
    const extraReinvestmentTarget = reinvestmentExtraConfigured
        ? roundMoney(ownReinvestmentBase * (reinvestmentExtraPct / 100))
        : 0;
    const remainingExtraReinvestmentTarget = roundMoney(Math.max(0, extraReinvestmentTarget - alreadyAllocatedExtraReinvestment));

    // Ganancia total del socio (para desglosar devolución de capital vs ganancia del socio)
    const totalOperationNetBeforePartnerSplit = roundMoney(agreedPrice - realInvestmentTotal - commissionAmount);
    const thirdPartyTotalProfitTarget = (!isConsignment && partnerPct > 0 && totalOperationNetBeforePartnerSplit > 0)
        ? roundMoney(totalOperationNetBeforePartnerSplit * (partnerPct / 100))
        : 0;
    const remainingThirdPartyCapitalToReturn = roundMoney(Math.max(0, thirdPartyRealInvestment - alreadyReturnedThirdPartyCapital));

    // Margen propio efectivamente cobrado acumulado hasta el momento
    const totalOwnCashCollectedEstimate = isConsignment
        ? roundMoney(Math.min(effectivelyCollectedCash, commissionAmount))
        : roundMoney(effectivelyCollectedCash * (agencyPct / 100));
    const totalCapitalRecoveredSoFar = roundMoney(Math.min(ownCashInvestmentToRecover, Math.max(0, totalOwnCashCollectedEstimate - pendingOperationCostsTotal)));
    const availableMarginCollectedTotal = roundMoney(Math.max(0, totalOwnCashCollectedEstimate - pendingOperationCostsTotal - totalCapitalRecoveredSoFar));

    return {
        saleId: sale?._id ? String(sale._id) : null,
        calculable: true,
        statusLabel: 'Calculable',
        missingReasons: [],
        saleCurrency,
        agreedPrice,
        purchaseCost,
        vehicleExpensesTotal,
        saleExpensesTotal,
        commissionAmount,
        commissionAlreadyPaid,
        unpaidExpensesTotal,
        unpaidCommission,
        realInvestmentTotal,
        ownRealInvestment,
        thirdPartyRealInvestment,
        thirdPartyTotalProfitTarget,
        remainingThirdPartyCapitalToReturn,
        alreadyReturnedThirdPartyCapital,
        alreadyReturnedThirdPartyProfit,
        agencyPct,
        partnerPct,
        isConsignment,
        thirdPartyOwner,
        effectivelyCollectedCash,
        totalOwnCashCollectedEstimate,
        tradeInCapitalInVehicles,
        ownTradeInCapitalShare,
        pendingOperationCostsTotal,
        alreadyReservedPendingCosts,
        remainingPendingCostsToReserve,
        ownPaidInvestment,
        ownCashInvestmentToRecover,
        alreadyRecoveredCapital,
        totalCapitalRecoveredSoFar,
        remainingCapitalToRecover,
        expectedCashTotal,
        pendingSaleBalance,
        availableMarginCollectedTotal,
        marginReleased: roundMoney(Math.max(alreadyDistributedMargin, availableMarginCollectedTotal)),
        alreadyDistributedMargin,
        pendingDistributionAmount,
        ownPurchaseCost,
        ownReinvestmentBase,
        reinvestmentExtraConfigured,
        reinvestmentExtraPct,
        extraReinvestmentTarget,
        alreadyAllocatedExtraReinvestment,
        remainingExtraReinvestmentTarget,
        reportedNetProfit,
        profitability
    };
}

/**
 * Ejecuta la cascada estricta de 6 pasos para un cobro confirmado:
 * 1. Separar fondos de terceros (devolución capital socio + ganancia socio / consignación) y obligaciones específicas de la operación.
 * 2. Recuperar la inversión propia -> Stock.
 * 3. Del margen efectivamente cobrado, cubrir faltantes de gastos esenciales próximos (Operativa, Impuestos, Deudas, Postventa).
 * 4. Completar la reserva mínima (Reserva).
 * 5. Completar el extra de reinversión hacia Stock (progresivo, sin repetir por cuota y sin reducir la ganancia informada).
 * 6. Distribuir el remanente según las reglas configuradas (Personal, Excedente a Stock/Crecimiento; o sin asignar si falta regla).
 */
export function computeSixStepWaterfallForCollection({
    amount,
    currency = 'ARS',
    ownership,
    operationState = null,
    enrichedBoxes = [],
    config = {}
}) {
    const curr = currency === 'USD' ? 'USD' : 'ARS';
    const totalCollected = roundMoney(Number(amount || 0));
    const thirdPartyAmount = roundMoney(Number(ownership?.tercerosAmount || 0));
    const ownGrossAmount = roundMoney(Math.max(0, totalCollected - thirdPartyAmount));

    // Desglose de terceros: devolución de capital de socio vs participación en ganancias
    let thirdPartyCapitalReturn = 0;
    let thirdPartyProfitShare = 0;
    if (thirdPartyAmount > 0) {
        if (operationState && operationState.calculable && operationState.partnerPct > 0) {
            thirdPartyCapitalReturn = roundMoney(Math.min(thirdPartyAmount, operationState.remainingThirdPartyCapitalToReturn || 0));
            thirdPartyProfitShare = roundMoney(Math.max(0, thirdPartyAmount - thirdPartyCapitalReturn));
        } else {
            thirdPartyCapitalReturn = thirdPartyAmount;
        }
    }

    // Si el cobro pertenece a una venta cuyos costos no son calculables (o cuya moneda difiere sin conversión),
    // no asumir costo cero: dejar el importe propio sin asignar explicando qué dato falta.
    if (operationState && (!operationState.calculable || operationState.saleCurrency !== curr)) {
        const missingMsg = !operationState.calculable
            ? (operationState.missingReasons || []).join(' ') || 'Falta información de costos del vehículo para separar capital y ganancia.'
            : `El cobro está en ${curr} pero la operación está pactada en ${operationState.saleCurrency} sin conversión registrada.`;

        return {
            calculable: false,
            currency: curr,
            totalCollected,
            ownGrossAmount,
            thirdPartyAmount,
            thirdPartyCapitalReturn,
            thirdPartyProfitShare,
            operationPendingCostsReserved: 0,
            capitalRecoveredToStock: 0,
            marginCollected: 0,
            essentialShortfallsCovered: 0,
            reserveCovered: 0,
            extraReinvestmentToStock: 0,
            remainderDistributed: 0,
            unassignedRemainder: ownGrossAmount,
            reinvestmentExtraPctApplied: null,
            unassignedReason: missingMsg,
            appliedAllocations: []
        };
    }

    const appliedAllocations = [];
    const boxMap = new Map((enrichedBoxes || []).map((b) => [b.key, b]));
    const getBoxName = (key) => boxMap.get(key)?.name || `Caja ${key}`;
    const getBoxShortfall = (key) => {
        const b = boxMap.get(key);
        if (!b) return 0;
        return roundMoney(curr === 'USD' ? Number(b.shortfallUSD || 0) : Number(b.shortfallARS || 0));
    };

    const addAllocation = (boxKey, allocAmount, step, historyType, reason) => {
        const cleanAmt = roundMoney(allocAmount);
        if (cleanAmt <= 0) return;
        appliedAllocations.push({
            boxKey,
            boxName: getBoxName(boxKey),
            amount: cleanAmt,
            step,
            historyType,
            reason
        });
    };

    // PASO 1: Separar obligaciones específicas pendientes de la operación (gastos del auto/venta impagos y comisión impaga)
    let remOwn = ownGrossAmount;
    let operationPendingCostsReserved = 0;
    if (operationState && operationState.remainingPendingCostsToReserve > 0) {
        operationPendingCostsReserved = roundMoney(Math.min(remOwn, operationState.remainingPendingCostsToReserve));
        if (operationPendingCostsReserved > 0) {
            addAllocation(
                'operativa',
                operationPendingCostsReserved,
                'paso_1_obligaciones_operacion',
                'reserva_costos_operacion',
                'Paso 1: Reserva para cancelar costos/comisiones pendientes de la operación (no disponible para Stock)'
            );
            remOwn = roundMoney(remOwn - operationPendingCostsReserved);
        }
    }

    // PASO 2: Recuperar la inversión propia disponible -> Stock
    let capitalRecoveredToStock = 0;
    if (operationState && operationState.remainingCapitalToRecover > 0 && remOwn > 0) {
        capitalRecoveredToStock = roundMoney(Math.min(remOwn, operationState.remainingCapitalToRecover));
        if (capitalRecoveredToStock > 0) {
            addAllocation(
                'stock',
                capitalRecoveredToStock,
                'paso_2_recuperacion_capital',
                'recuperacion_capital',
                'Paso 2: Recuperación de inversión propia hacia Caja Stock'
            );
            remOwn = roundMoney(remOwn - capitalRecoveredToStock);
        }
    }

    // Lo que supera la inversión propia pendiente de recuperar es Margen Cobrado disponible para distribuir
    const marginCollected = remOwn;
    let remMargin = marginCollected;

    // PASO 3: Del margen efectivamente cobrado, cubrir faltantes de gastos esenciales próximos
    const defaultEssentials = ['operativa', 'impuestos', 'deudas', 'postventa'];
    const configuredPriority = Array.isArray(config?.priorityOrder) && config.priorityOrder.length > 0
        ? config.priorityOrder
        : defaultEssentials;
    const orderedEssentials = [
        ...configuredPriority.filter((k) => defaultEssentials.includes(k)),
        ...defaultEssentials.filter((k) => !configuredPriority.includes(k))
    ];

    let essentialShortfallsCovered = 0;
    for (const key of orderedEssentials) {
        if (remMargin <= 0) break;
        let sf = getBoxShortfall(key);
        if (key === 'operativa' && operationPendingCostsReserved > 0) {
            sf = roundMoney(Math.max(0, sf - operationPendingCostsReserved));
        }
        if (sf > 0) {
            const take = roundMoney(Math.min(remMargin, sf));
            if (take > 0) {
                addAllocation(
                    key,
                    take,
                    'paso_3_gastos_esenciales',
                    'distribucion_cobro',
                    `Paso 3: Cobertura de faltante de gastos esenciales (${getBoxName(key)})`
                );
                remMargin = roundMoney(remMargin - take);
                essentialShortfallsCovered = roundMoney(essentialShortfallsCovered + take);
            }
        }
    }

    // PASO 4: Completar la reserva mínima (Reserva de Liquidez)
    let reserveCovered = 0;
    if (remMargin > 0) {
        const reservaSf = getBoxShortfall('reserva');
        if (reservaSf > 0) {
            reserveCovered = roundMoney(Math.min(remMargin, reservaSf));
            if (reserveCovered > 0) {
                addAllocation(
                    'reserva',
                    reserveCovered,
                    'paso_4_reserva_minima',
                    'distribucion_cobro',
                    'Paso 4: Completar objetivo de Reserva de Liquidez mínima'
                );
                remMargin = roundMoney(remMargin - reserveCovered);
            }
        }
    }

    // PASO 5: Completar el extra de reinversión sobre inversión real (%) hacia Stock
    let extraReinvestmentToStock = 0;
    const extraConfigured = Boolean(
        config?.reinvestmentExtraConfigured &&
        config?.reinvestmentExtraPct !== null &&
        config?.reinvestmentExtraPct !== undefined &&
        Number.isFinite(Number(config.reinvestmentExtraPct))
    );
    const extraPct = extraConfigured ? Number(config.reinvestmentExtraPct) : null;

    if (remMargin > 0 && extraConfigured && extraPct > 0 && operationState && operationState.remainingExtraReinvestmentTarget > 0) {
        extraReinvestmentToStock = roundMoney(Math.min(remMargin, operationState.remainingExtraReinvestmentTarget));
        if (extraReinvestmentToStock > 0) {
            addAllocation(
                'stock',
                extraReinvestmentToStock,
                'paso_5_extra_reinversion',
                'extra_reinversion',
                `Paso 5: Extra de reinversión (${extraPct}% sobre inversión real) destinado a Caja Stock`
            );
            remMargin = roundMoney(remMargin - extraReinvestmentToStock);
        }
    }

    // PASO 6: Distribuir el remanente según las reglas configuradas (Personal y Regla de Excedente)
    let remainderDistributed = 0;
    const missingNotes = [];
    if (!extraConfigured && operationState) {
        missingNotes.push('Extra de reinversión (%) no configurado.');
    }

    if (remMargin > 0) {
        const personalSf = getBoxShortfall('personal');
        if (personalSf > 0) {
            const takePersonal = roundMoney(Math.min(remMargin, personalSf));
            if (takePersonal > 0) {
                addAllocation(
                    'personal',
                    takePersonal,
                    'paso_6_remanente_reglas',
                    'distribucion_cobro',
                    'Paso 6: Cobertura de presupuesto de Caja Personal (retiros del titular)'
                );
                remMargin = roundMoney(remMargin - takePersonal);
                remainderDistributed = roundMoney(remainderDistributed + takePersonal);
            }
        }
    }

    if (remMargin > 0) {
        if (config?.surplusRule?.configured) {
            const stPct = Math.max(0, Number(config.surplusRule.stockPercent || 0));
            const crPct = Math.max(0, Number(config.surplusRule.crecimientoPercent || 0));
            const stAmt = roundMoney(remMargin * (stPct / 100));
            const crAmt = roundMoney(Math.min(remMargin - stAmt, remMargin * (crPct / 100)));

            if (stAmt > 0) {
                addAllocation(
                    'stock',
                    stAmt,
                    'paso_6_remanente_reglas',
                    'distribucion_cobro',
                    `Paso 6: Excedente de ganancia según regla configurada (${stPct}% a Stock)`
                );
                remainderDistributed = roundMoney(remainderDistributed + stAmt);
                remMargin = roundMoney(remMargin - stAmt);
            }
            if (crAmt > 0) {
                addAllocation(
                    'crecimiento',
                    crAmt,
                    'paso_6_remanente_reglas',
                    'distribucion_cobro',
                    `Paso 6: Excedente de ganancia según regla configurada (${crPct}% a Crecimiento)`
                );
                remainderDistributed = roundMoney(remainderDistributed + crAmt);
                remMargin = roundMoney(remMargin - crAmt);
            }
            if (remMargin > 0) {
                missingNotes.push('Remanente libre tras aplicar porcentajes de excedente.');
            }
        } else {
            missingNotes.push('Regla de distribución del remanente (Stock / Crecimiento) no configurada; el excedente queda en Fondos propios sin asignar.');
        }
    }

    return {
        calculable: true,
        currency: curr,
        totalCollected,
        ownGrossAmount,
        thirdPartyAmount,
        thirdPartyCapitalReturn,
        thirdPartyProfitShare,
        operationPendingCostsReserved,
        capitalRecoveredToStock,
        marginCollected,
        essentialShortfallsCovered,
        reserveCovered,
        extraReinvestmentToStock,
        remainderDistributed,
        unassignedRemainder: remMargin,
        reinvestmentExtraPctApplied: extraPct,
        unassignedReason: remMargin > 0 ? (missingNotes.join(' ') || 'Remanente disponible sin regla de destino.') : null,
        appliedAllocations
    };
}

/**
 * Esquemas acordados de reparto de margen disponible en Tesorería Estratégica.
 * Se aplican exclusivamente sobre el margen distribuible positivo después de:
 *   1) Recuperar capital (costo de adquisición + gastos directos pagados -> Stock)
 *   2) Separar obligaciones e impuestos registrados (-> Operativa / Impuestos)
 */
export const DISTRIBUTION_SCHEMES = {
    caja_ajustada: {
        key: 'caja_ajustada',
        name: 'Caja ajustada',
        description: 'Gastos mensuales / operación (70%), Reserva de liquidez (20%) y Fondo interno de postventa (10%).',
        percentages: {
            operativa: 70,
            reserva: 20,
            postventa: 10,
            crecimiento: 0,
            personal: 0
        },
        destinations: [
            { destinationKey: 'operativa', destinationLabel: 'Gastos mensuales / operación', boxKey: 'operativa', boxName: 'Caja Operativa', percentage: 70 },
            { destinationKey: 'reserva', destinationLabel: 'Reserva de liquidez', boxKey: 'reserva', boxName: 'Reserva de Liquidez', percentage: 20 },
            { destinationKey: 'postventa', destinationLabel: 'Fondo interno de postventa', boxKey: 'postventa', boxName: 'Provisión Postventa / Garantía', percentage: 10 },
            { destinationKey: 'crecimiento', destinationLabel: 'Crecimiento / reposición adicional', boxKey: 'crecimiento', boxName: 'Crecimiento / Expansión', percentage: 0 },
            { destinationKey: 'personal', destinationLabel: 'Utilidad del titular', boxKey: 'personal', boxName: 'Caja Personal', percentage: 0 }
        ]
    },
    estabilizacion: {
        key: 'estabilizacion',
        name: 'Estabilización',
        description: 'Gastos mensuales / operación (60%), Reserva de liquidez (20%), Fondo interno de postventa (10%) y Crecimiento / reposición adicional (10%).',
        percentages: {
            operativa: 60,
            reserva: 20,
            postventa: 10,
            crecimiento: 10,
            personal: 0
        },
        destinations: [
            { destinationKey: 'operativa', destinationLabel: 'Gastos mensuales / operación', boxKey: 'operativa', boxName: 'Caja Operativa', percentage: 60 },
            { destinationKey: 'reserva', destinationLabel: 'Reserva de liquidez', boxKey: 'reserva', boxName: 'Reserva de Liquidez', percentage: 20 },
            { destinationKey: 'postventa', destinationLabel: 'Fondo interno de postventa', boxKey: 'postventa', boxName: 'Provisión Postventa / Garantía', percentage: 10 },
            { destinationKey: 'crecimiento', destinationLabel: 'Crecimiento / reposición adicional', boxKey: 'crecimiento', boxName: 'Crecimiento / Expansión', percentage: 10 },
            { destinationKey: 'personal', destinationLabel: 'Utilidad del titular', boxKey: 'personal', boxName: 'Caja Personal', percentage: 0 }
        ]
    },
    caja_solida: {
        key: 'caja_solida',
        name: 'Caja sólida',
        description: 'Gastos mensuales / operación (50%), Reserva de liquidez (15%), Fondo interno de postventa (10%), Crecimiento / reposición adicional (20%) y Utilidad del titular (5%).',
        percentages: {
            operativa: 50,
            reserva: 15,
            postventa: 10,
            crecimiento: 20,
            personal: 5
        },
        destinations: [
            { destinationKey: 'operativa', destinationLabel: 'Gastos mensuales / operación', boxKey: 'operativa', boxName: 'Caja Operativa', percentage: 50 },
            { destinationKey: 'reserva', destinationLabel: 'Reserva de liquidez', boxKey: 'reserva', boxName: 'Reserva de Liquidez', percentage: 15 },
            { destinationKey: 'postventa', destinationLabel: 'Fondo interno de postventa', boxKey: 'postventa', boxName: 'Provisión Postventa / Garantía', percentage: 10 },
            { destinationKey: 'crecimiento', destinationLabel: 'Crecimiento / reposición adicional', boxKey: 'crecimiento', boxName: 'Crecimiento / Expansión', percentage: 20 },
            { destinationKey: 'personal', destinationLabel: 'Utilidad del titular', boxKey: 'personal', boxName: 'Caja Personal', percentage: 5 }
        ]
    }
};

/**
 * Calcula la propuesta de distribución para "Registrar cobro y distribuir" siguiendo el orden:
 *   1. Recuperar capital (costo de adquisición y gastos directos ya pagados, descontando lo recuperado antes -> Stock).
 *   2. Separar obligaciones e impuestos (únicamente los que correspondan y estén registrados -> Operativa / Impuestos).
 *   3. Distribuir el margen disponible positivo según el esquema elegido (Caja ajustada / Estabilización / Caja sólida),
 *      conservando el total exacto tras redondeos.
 */
export function computeSchemeDistributionForCollection({
    amount,
    currency = 'ARS',
    ownership = null,
    operationState = null,
    schemeKey = null,
    enrichedBoxes = [],
    config = {},
    registeredTaxAmount = 0,
    forcePendingDistribution = false
}) {
    const curr = currency === 'USD' ? 'USD' : 'ARS';
    const totalCollected = roundMoney(Number(amount || 0));
    const thirdPartyAmount = roundMoney(Number(ownership?.tercerosAmount || 0));
    const ownGrossAmount = roundMoney(Math.max(0, totalCollected - thirdPartyAmount));

    let thirdPartyCapitalReturn = 0;
    let thirdPartyProfitShare = 0;
    if (thirdPartyAmount > 0) {
        if (operationState && operationState.calculable && operationState.partnerPct > 0) {
            thirdPartyCapitalReturn = roundMoney(Math.min(thirdPartyAmount, operationState.remainingThirdPartyCapitalToReturn || 0));
            thirdPartyProfitShare = roundMoney(Math.max(0, thirdPartyAmount - thirdPartyCapitalReturn));
        } else {
            thirdPartyCapitalReturn = thirdPartyAmount;
        }
    }

    const candidateSchemeKey = schemeKey || config?.activeDistributionScheme || null;
    const scheme = candidateSchemeKey && DISTRIBUTION_SCHEMES[candidateSchemeKey]
        ? DISTRIBUTION_SCHEMES[candidateSchemeKey]
        : null;

    const boxMap = new Map((enrichedBoxes || []).map((b) => [b.key, b]));
    const getBoxName = (key) => boxMap.get(key)?.name || {
        stock: 'Reposición de Stock',
        operativa: 'Caja Operativa',
        impuestos: 'Impuestos y Tasas',
        reserva: 'Reserva de Liquidez',
        postventa: 'Provisión Postventa / Garantía',
        crecimiento: 'Crecimiento / Expansión',
        personal: 'Caja Personal',
        deudas: 'Deudas y Compromisos'
    }[key] || `Caja ${key}`;

    const baseDestinations = (scheme?.destinations || DISTRIBUTION_SCHEMES.estabilizacion.destinations).map((d) => ({
        destinationKey: d.destinationKey,
        destinationLabel: d.destinationLabel,
        boxKey: d.boxKey,
        boxName: getBoxName(d.boxKey),
        percentage: scheme ? d.percentage : 0,
        amount: 0
    }));

    // Validar si falta información indispensable para calcular el reparto
    if (!operationState || !operationState.calculable || operationState.saleCurrency !== curr) {
        let missingMsg = 'Falta información indispensable para calcular el reparto.';
        if (!operationState) {
            missingMsg = 'Falta vincular la venta para determinar el costo de adquisición y el capital pendiente de recuperar.';
        } else if (!operationState.calculable) {
            missingMsg = (operationState.missingReasons || []).join(' ') || 'Falta el costo de adquisición del vehículo para separar recuperación de capital y margen.';
        } else if (operationState.saleCurrency !== curr) {
            missingMsg = `El cobro está en ${curr} pero la venta está pactada en ${operationState.saleCurrency}. No se aplican conversiones silenciosas.`;
        }

        return {
            calculable: false,
            isPendingDistribution: true,
            requiresSchemeSelection: false,
            currency: curr,
            totalCollected,
            ownGrossAmount,
            thirdPartyAmount,
            thirdPartyCapitalReturn,
            thirdPartyProfitShare,
            capitalRecoveredToStock: 0,
            operationPendingCostsReserved: 0,
            taxObligationsSeparated: 0,
            obligationsSeparated: 0,
            extraReinvestmentToStock: 0,
            extraReinvestmentPctApplied: null,
            extraReinvestmentTarget: 0,
            remainingExtraReinvestmentTarget: 0,
            marginCollected: 0,
            distributableMargin: 0,
            marginDistributed: 0,
            pendingDistributionAmount: ownGrossAmount,
            unassignedRemainder: ownGrossAmount,
            pendingReason: missingMsg,
            unassignedReason: missingMsg,
            noMarginReason: null,
            schemeKey: scheme?.key || null,
            schemeName: scheme?.name || null,
            schemePercentages: scheme?.percentages || null,
            destinationBreakdown: baseDestinations,
            appliedAllocations: []
        };
    }

    if (forcePendingDistribution) {
        const pendingMsg = 'Registrado como pendiente de distribución para repartir más adelante.';
        return {
            calculable: true,
            isPendingDistribution: true,
            requiresSchemeSelection: false,
            currency: curr,
            totalCollected,
            ownGrossAmount,
            thirdPartyAmount,
            thirdPartyCapitalReturn,
            thirdPartyProfitShare,
            capitalRecoveredToStock: 0,
            operationPendingCostsReserved: 0,
            taxObligationsSeparated: 0,
            obligationsSeparated: 0,
            extraReinvestmentToStock: 0,
            extraReinvestmentPctApplied: null,
            extraReinvestmentTarget: 0,
            remainingExtraReinvestmentTarget: 0,
            marginCollected: 0,
            distributableMargin: 0,
            marginDistributed: 0,
            pendingDistributionAmount: ownGrossAmount,
            unassignedRemainder: ownGrossAmount,
            pendingReason: pendingMsg,
            unassignedReason: pendingMsg,
            noMarginReason: null,
            schemeKey: scheme?.key || null,
            schemeName: scheme?.name || null,
            schemePercentages: scheme?.percentages || null,
            destinationBreakdown: baseDestinations,
            appliedAllocations: []
        };
    }

    const appliedAllocations = [];
    const addAllocation = (boxKey, allocAmount, step, historyType, reason) => {
        const cleanAmt = roundMoney(allocAmount);
        if (cleanAmt <= 0) return;
        appliedAllocations.push({
            boxKey,
            boxName: getBoxName(boxKey),
            amount: cleanAmt,
            step,
            historyType,
            reason
        });
    };

    let remOwn = ownGrossAmount;

    // 1. RECUPERAR CAPITAL: costo de adquisición y gastos directos ya pagados, descontando lo recuperado anteriormente
    let capitalRecoveredToStock = 0;
    const remCap = Math.max(0, roundMoney(Number(operationState.remainingCapitalToRecover || 0)));
    if (remCap > 0 && remOwn > 0) {
        capitalRecoveredToStock = roundMoney(Math.min(remOwn, remCap));
        remOwn = roundMoney(remOwn - capitalRecoveredToStock);
    }

    // 2. SEPARAR OBLIGACIONES E IMPUESTOS: únicamente los que correspondan y estén registrados
    let operationPendingCostsReserved = 0;
    const remObligations = Math.max(0, roundMoney(Number(operationState.remainingPendingCostsToReserve || 0)));
    if (remObligations > 0 && remOwn > 0) {
        operationPendingCostsReserved = roundMoney(Math.min(remOwn, remObligations));
        remOwn = roundMoney(remOwn - operationPendingCostsReserved);
    }

    let taxObligationsSeparated = 0;
    const cleanRegisteredTax = Math.max(0, roundMoney(Number(registeredTaxAmount || 0)));
    if (cleanRegisteredTax > 0 && remOwn > 0) {
        taxObligationsSeparated = roundMoney(Math.min(remOwn, cleanRegisteredTax));
        remOwn = roundMoney(remOwn - taxObligationsSeparated);
    }

    const obligationsSeparated = roundMoney(operationPendingCostsReserved + taxObligationsSeparated);

    // 3. DISTRIBUIR EL MARGEN DISPONIBLE: solo el margen distribuible en caja positivo, respaldado por dinero efectivamente cobrado
    let noMarginReason = null;
    if (operationState.reportedNetProfit !== null && Number(operationState.reportedNetProfit) <= 0) {
        if (remOwn > 0) {
            capitalRecoveredToStock = roundMoney(capitalRecoveredToStock + remOwn);
            remOwn = 0;
        }
        noMarginReason = 'La venta no posee margen distribuible positivo (operación sin ganancia neta). Todo el cobro propio se destina a recuperación de capital y obligaciones registradas.';
    } else if (Number(operationState.tradeInCapitalInVehicles || 0) > 0 && remOwn > 0) {
        // En permutas, el vehículo recibido es stock, no efectivo: no liberar margen que todavía dependa de vender el usado
        const expectedCash = Math.max(0, roundMoney(Number(operationState.expectedCashTotal ?? (operationState.agreedPrice - operationState.tradeInCapitalInVehicles))));
        const maxCashMargin = Math.max(0, roundMoney(expectedCash - Number(operationState.ownCashInvestmentToRecover || 0) - Number(operationState.pendingOperationCostsTotal || 0)));
        const remCashMarginAllowed = Math.max(0, roundMoney(maxCashMargin - Number(operationState.alreadyDistributedMargin || 0)));
        if (remOwn > remCashMarginAllowed) {
            const excessToCap = roundMoney(remOwn - remCashMarginAllowed);
            capitalRecoveredToStock = roundMoney(capitalRecoveredToStock + excessToCap);
            remOwn = remCashMarginAllowed;
            if (remOwn <= 0) {
                noMarginReason = 'El margen restante de la operación está representado en el vehículo tomado en permuta (stock, no efectivo) y solo se liberará cuando se venda.';
            }
        }
    }

    // 3. EXTRA DE REINVERSIÓN HACIA STOCK: reservado sobre el margen disponible positivo, hasta el objetivo acumulado de la venta
    let extraReinvestmentToStock = 0;
    const extraConfigured = Boolean(
        config?.reinvestmentExtraConfigured &&
        config?.reinvestmentExtraPct !== null &&
        config?.reinvestmentExtraPct !== undefined &&
        Number.isFinite(Number(config.reinvestmentExtraPct)) &&
        Number(config.reinvestmentExtraPct) > 0
    );
    const extraPct = extraConfigured ? Number(config.reinvestmentExtraPct) : null;
    const remainingExtraTarget = Math.max(0, roundMoney(Number(operationState.remainingExtraReinvestmentTarget || 0)));

    if (remOwn > 0 && extraConfigured && remainingExtraTarget > 0) {
        extraReinvestmentToStock = roundMoney(Math.min(remOwn, remainingExtraTarget));
        remOwn = roundMoney(remOwn - extraReinvestmentToStock);
    }

    const distributableMargin = roundMoney(Math.max(0, remOwn));

    if (capitalRecoveredToStock > 0) {
        addAllocation(
            'stock',
            capitalRecoveredToStock,
            'paso_1_recuperar_capital',
            'recuperacion_capital',
            'Paso 1: Recuperación de capital invertido (costo de adquisición y gastos directos pagados)'
        );
    }

    if (operationPendingCostsReserved > 0) {
        addAllocation(
            'operativa',
            operationPendingCostsReserved,
            'paso_2_obligaciones_registradas',
            'reserva_costos_operacion',
            'Paso 2: Separación de obligaciones registradas de la operación (gastos/comisiones pendientes)'
        );
    }

    if (taxObligationsSeparated > 0) {
        addAllocation(
            'impuestos',
            taxObligationsSeparated,
            'paso_2_impuestos_registrados',
            'distribucion_cobro',
            'Paso 2: Separación de impuestos registrados en la operación'
        );
    }

    if (extraReinvestmentToStock > 0) {
        addAllocation(
            'stock',
            extraReinvestmentToStock,
            'paso_3_extra_reinversion',
            'extra_reinversion',
            `Paso 3: Extra de reinversión (${extraPct}% sobre costo de compra propio) destinado a Caja Stock`
        );
    }

    if (distributableMargin <= 0) {
        if (!noMarginReason) {
            const stillToRecover = Math.max(0, roundMoney(remCap - capitalRecoveredToStock));
            if (stillToRecover > 0) {
                noMarginReason = `El importe cobrado se destina íntegramente a recuperar el capital invertido. Todavía restan recuperar ${curr} ${stillToRecover.toLocaleString('es-AR')} de capital antes de liberar margen distribuible.`;
            } else if (extraReinvestmentToStock > 0) {
                noMarginReason = `El cobro cubre la recuperación de capital y reserva de extra de reinversión hacia Stock (${curr} ${extraReinvestmentToStock.toLocaleString('es-AR')}), sin excedente de margen para repartir en este movimiento.`;
            } else {
                noMarginReason = 'Este cobro cubre exactamente la recuperación de capital y obligaciones pendientes, sin excedente de margen para repartir en este movimiento.';
            }
        }

        return {
            calculable: true,
            isPendingDistribution: false,
            requiresSchemeSelection: false,
            currency: curr,
            totalCollected,
            ownGrossAmount,
            thirdPartyAmount,
            thirdPartyCapitalReturn,
            thirdPartyProfitShare,
            capitalRecoveredToStock,
            operationPendingCostsReserved,
            taxObligationsSeparated,
            obligationsSeparated,
            extraReinvestmentToStock,
            extraReinvestmentPctApplied: extraPct,
            extraReinvestmentTarget: operationState.extraReinvestmentTarget || 0,
            remainingExtraReinvestmentTarget: Math.max(0, roundMoney(remainingExtraTarget - extraReinvestmentToStock)),
            marginCollected: extraReinvestmentToStock,
            distributableMargin: 0,
            marginDistributed: 0,
            pendingDistributionAmount: 0,
            unassignedRemainder: 0,
            pendingReason: null,
            unassignedReason: null,
            noMarginReason,
            schemeKey: scheme?.key || null,
            schemeName: scheme?.name || null,
            schemePercentages: scheme?.percentages || null,
            destinationBreakdown: baseDestinations,
            appliedAllocations
        };
    }

    // Hay margen distribuible positivo (> 0). Verificar esquema seleccionado
    if (!scheme) {
        const msgScheme = 'Seleccioná un esquema de reparto (Caja ajustada, Estabilización o Caja sólida) para distribuir el margen disponible.';
        return {
            calculable: true,
            isPendingDistribution: true,
            requiresSchemeSelection: true,
            currency: curr,
            totalCollected,
            ownGrossAmount,
            thirdPartyAmount,
            thirdPartyCapitalReturn,
            thirdPartyProfitShare,
            capitalRecoveredToStock,
            operationPendingCostsReserved,
            taxObligationsSeparated,
            obligationsSeparated,
            extraReinvestmentToStock,
            extraReinvestmentPctApplied: extraPct,
            extraReinvestmentTarget: operationState.extraReinvestmentTarget || 0,
            remainingExtraReinvestmentTarget: Math.max(0, roundMoney(remainingExtraTarget - extraReinvestmentToStock)),
            marginCollected: roundMoney(extraReinvestmentToStock + distributableMargin),
            distributableMargin,
            marginDistributed: 0,
            pendingDistributionAmount: ownGrossAmount,
            unassignedRemainder: ownGrossAmount,
            pendingReason: msgScheme,
            unassignedReason: msgScheme,
            noMarginReason: null,
            schemeKey: null,
            schemeName: null,
            schemePercentages: null,
            destinationBreakdown: baseDestinations,
            appliedAllocations: []
        };
    }

    // Calcular montos exactos según el esquema elegido, asegurando que los redondeos conserven el total exacto
    const destinationBreakdown = scheme.destinations.map((dest) => ({
        destinationKey: dest.destinationKey,
        destinationLabel: dest.destinationLabel,
        boxKey: dest.boxKey,
        boxName: getBoxName(dest.boxKey),
        percentage: dest.percentage,
        amount: dest.percentage > 0 ? roundMoney(distributableMargin * (dest.percentage / 100)) : 0
    }));

    const sumDest = roundMoney(destinationBreakdown.reduce((acc, d) => acc + d.amount, 0));
    const roundingDiff = roundMoney(distributableMargin - sumDest);
    if (roundingDiff !== 0) {
        for (let i = destinationBreakdown.length - 1; i >= 0; i--) {
            if (destinationBreakdown[i].percentage > 0) {
                destinationBreakdown[i].amount = roundMoney(Math.max(0, destinationBreakdown[i].amount + roundingDiff));
                break;
            }
        }
    }

    for (const dest of destinationBreakdown) {
        if (dest.amount > 0) {
            addAllocation(
                dest.boxKey,
                dest.amount,
                'paso_3_margen_esquema',
                'distribucion_cobro',
                `Paso 3 (${scheme.name} · ${dest.percentage}%): ${dest.destinationLabel}`
            );
        }
    }

    return {
        calculable: true,
        isPendingDistribution: false,
        requiresSchemeSelection: false,
        currency: curr,
        totalCollected,
        ownGrossAmount,
        thirdPartyAmount,
        thirdPartyCapitalReturn,
        thirdPartyProfitShare,
        capitalRecoveredToStock,
        operationPendingCostsReserved,
        taxObligationsSeparated,
        obligationsSeparated,
        extraReinvestmentToStock,
        extraReinvestmentPctApplied: extraPct,
        extraReinvestmentTarget: operationState.extraReinvestmentTarget || 0,
        remainingExtraReinvestmentTarget: Math.max(0, roundMoney(remainingExtraTarget - extraReinvestmentToStock)),
        marginCollected: roundMoney(extraReinvestmentToStock + distributableMargin),
        distributableMargin,
        marginDistributed: distributableMargin,
        pendingDistributionAmount: 0,
        unassignedRemainder: 0,
        pendingReason: null,
        unassignedReason: null,
        noMarginReason: null,
        schemeKey: scheme.key,
        schemeName: scheme.name,
        schemePercentages: scheme.percentages,
        destinationBreakdown,
        appliedAllocations
    };
}
