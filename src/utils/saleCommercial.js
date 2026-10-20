// Reglas comerciales de una venta compartidas entre servidor (server.js) y CRM (React).
// Mantener este archivo libre de dependencias para poder importarlo desde ambos lados.

export const VALID_INSTALLMENT_COUNTS = [3, 6, 12, 18, 24];

export const roundMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Acepta número o texto ("1,3" / "1.3"). Devuelve NaN si no es un número válido.
export const parseDecimal = (raw) => {
    if (typeof raw === 'number') return raw;
    if (raw === null || raw === undefined) return NaN;
    const text = String(raw).trim().replace(',', '.');
    if (text === '') return NaN;
    return Number(text);
};

export const normalizeCurrency = (code) => {
    if (!code) return 'ARS';
    const clean = String(code).trim().toUpperCase();
    if (clean === 'USD' || clean === 'U$S' || clean === 'US$') return 'USD';
    return 'ARS';
};

// Comisión por porcentaje: importe = base × porcentaje / 100.
// La base es el precio total pactado de la venta (en ventas financiadas, el total de la operación:
// entrega + cuotas con interés). No se suman por separado entrega, cuotas ni permutas.
export const computeCommissionAmount = (base, percent) => {
    const b = Number(base);
    const p = parseDecimal(percent);
    if (!Number.isFinite(b) || !Number.isFinite(p)) return 0;
    return roundMoney((b * p) / 100);
};

export const validateCommissionPercent = (raw) => {
    const p = parseDecimal(raw);
    if (!Number.isFinite(p)) return { ok: false, message: 'Ingresá un porcentaje de comisión válido.' };
    if (p < 0) return { ok: false, message: 'El porcentaje de comisión no puede ser negativo.' };
    if (p > 100) return { ok: false, message: 'El porcentaje de comisión no puede superar 100%.' };
    return { ok: true, value: p };
};

// Resuelve el costo real de adquisición (compra o toma en permuta) de un vehículo vinculado,
// incluso si su estado actual es "Vendido". Nunca asume costo 0 si falta el dato.
export const resolveVehicleAcquisitionCost = (vehicle, legacyTradeInOrigin = null) => {
    if (!vehicle || typeof vehicle !== 'object') {
        return {
            hasVehicle: false,
            hasCost: false,
            amount: null,
            currency: null,
            source: null,
            mismatch: false,
            originSaleId: null
        };
    }

    const origin = vehicle.tradeInOrigin?.saleId
        ? vehicle.tradeInOrigin
        : (legacyTradeInOrigin?.saleId ? legacyTradeInOrigin : null);

    if (origin?.saleId && Number(origin.value) > 0) {
        const originVal = roundMoney(Number(origin.value));
        const originCur = normalizeCurrency(origin.currency || vehicle.purchaseCurrency || vehicle.currency);
        const mismatch = Number(vehicle.purchasePrice) > 0 && roundMoney(Number(vehicle.purchasePrice)) !== originVal;
        return {
            hasVehicle: true,
            hasCost: true,
            amount: originVal,
            currency: originCur,
            source: 'valor_de_toma',
            mismatch,
            originSaleId: String(origin.saleId)
        };
    }

    if (Number(vehicle.purchasePrice) > 0) {
        const purchaseVal = roundMoney(Number(vehicle.purchasePrice));
        const purchaseCur = normalizeCurrency(vehicle.purchaseCurrency || vehicle.currency);
        return {
            hasVehicle: true,
            hasCost: true,
            amount: purchaseVal,
            currency: purchaseCur,
            source: origin?.saleId ? 'valor_de_toma' : 'compra',
            mismatch: false,
            originSaleId: origin?.saleId ? String(origin.saleId) : null
        };
    }

    return {
        hasVehicle: true,
        hasCost: false,
        amount: null,
        currency: normalizeCurrency(vehicle.purchaseCurrency || vehicle.currency),
        source: origin?.saleId ? 'valor_de_toma' : 'compra',
        mismatch: false,
        originSaleId: origin?.saleId ? String(origin.saleId) : null
    };
};

// Ganancia de la operación (devengada). No equivale a dinero cobrado.
// Criterio canónico compartido por servidor, panel comercial, cadenas de permutas y Tesorería:
//   Precio total pactado
//   − Compra/toma (costo real del vehículo vinculado, aunque esté Vendido)
//   − Gastos del vehículo (car.expenses)
//   − Gastos comerciales (sale.saleExpenses)
//   − Comisión (descontada exactamente una vez)
//   = Ganancia neta de la operación
// Nunca asume costo 0 si falta el vehículo, su costo o una conversión necesaria entre ARS y USD.
export const computeSaleProfit = ({
    salePrice,
    saleCurrency = 'ARS',
    vehicle = undefined,
    hasVehicle = undefined,
    legacyTradeInOrigin = null,
    purchaseCost = undefined,
    purchaseCurrency = undefined,
    acquisitionSource = undefined,
    vehicleExpenses = undefined,
    saleExpenses = undefined,
    expenses = undefined,
    commissionAmount = undefined,
    commissionCurrency = undefined,
    commissionSettings = undefined,
    exchangeRate = null,
    investorPercentage = undefined
} = {}) => {
    const targetCurrency = normalizeCurrency(saleCurrency);
    const agreedPrice = roundMoney(Number(salePrice) || 0);
    const validRate = Number(exchangeRate) > 0 ? Number(exchangeRate) : null;

    const toTargetCurrency = (amount, fromCurrency) => {
        const amt = roundMoney(Number(amount) || 0);
        const normFrom = normalizeCurrency(fromCurrency || targetCurrency);
        if (amt === 0 || normFrom === targetCurrency) {
            return { ok: true, amount: amt, originalAmount: amt, originalCurrency: normFrom, converted: false };
        }
        if (validRate) {
            const convertedAmt = targetCurrency === 'ARS'
                ? roundMoney(amt * validRate)
                : roundMoney(amt / validRate);
            return {
                ok: true,
                amount: convertedAmt,
                originalAmount: amt,
                originalCurrency: normFrom,
                converted: true,
                exchangeRate: validRate
            };
        }
        return { ok: false, amount: null, originalAmount: amt, originalCurrency: normFrom, converted: false };
    };

    const vehObj = vehicle && typeof vehicle === 'object' ? vehicle : null;
    let vehicleLinked = false;
    let hasCost = false;
    let rawCost = null;
    let rawCostCurrency = targetCurrency;
    let costSource = acquisitionSource || 'compra';
    let costMismatch = false;

    if (vehObj) {
        const resolved = resolveVehicleAcquisitionCost(vehObj, legacyTradeInOrigin);
        vehicleLinked = true;
        if (resolved.hasCost && resolved.amount > 0) {
            hasCost = true;
            rawCost = resolved.amount;
            rawCostCurrency = resolved.currency;
            costSource = resolved.source;
            costMismatch = resolved.mismatch;
        } else if (Number(purchaseCost) > 0) {
            hasCost = true;
            rawCost = roundMoney(Number(purchaseCost));
            rawCostCurrency = normalizeCurrency(purchaseCurrency || vehObj.purchaseCurrency || vehObj.currency || targetCurrency);
            costSource = acquisitionSource || resolved.source || 'compra';
        } else {
            hasCost = false;
            rawCostCurrency = resolved.currency || targetCurrency;
            costSource = resolved.source || 'compra';
        }
    } else if (hasVehicle === false || vehicle === null) {
        vehicleLinked = false;
        hasCost = false;
    } else if (Number(purchaseCost) > 0) {
        vehicleLinked = true;
        hasCost = true;
        rawCost = roundMoney(Number(purchaseCost));
        rawCostCurrency = normalizeCurrency(purchaseCurrency || targetCurrency);
        costSource = acquisitionSource || 'compra';
    } else if (hasVehicle === true || purchaseCost !== undefined) {
        vehicleLinked = true;
        hasCost = false;
        rawCostCurrency = normalizeCurrency(purchaseCurrency || targetCurrency);
    }

    const missingReasons = [];
    const missingFields = [];

    if (!(agreedPrice > 0)) {
        missingFields.push('salePrice');
        missingReasons.push('Falta el precio total pactado de la venta.');
    }

    if (!vehicleLinked) {
        missingFields.push('vehicle');
        missingReasons.push('Falta vincular el vehículo a la venta.');
    } else if (!hasCost || !(rawCost > 0)) {
        missingFields.push('purchaseCost');
        missingReasons.push('Falta registrar el costo de compra/toma del vehículo vinculado.');
    }

    let costConv = { ok: false, amount: null, converted: false };
    let costComparable = true;
    if (hasCost && rawCost > 0) {
        costConv = toTargetCurrency(rawCost, rawCostCurrency);
        costComparable = costConv.ok;
        if (!costConv.ok) {
            missingFields.push('costExchangeRate');
            missingReasons.push(
                `Falta conversión registrada entre ${rawCostCurrency} y ${targetCurrency} para el costo de compra/toma (${rawCostCurrency} ${rawCost.toLocaleString('es-AR')}).`
            );
        }
    } else {
        costComparable = false;
    }

    // Gastos atribuibles al vehículo (car.expenses)
    const rawVehExpenses = Array.isArray(vehicleExpenses)
        ? vehicleExpenses
        : (Array.isArray(vehObj?.expenses) ? vehObj.expenses : []);
    let vehicleExpensesTotal = 0;
    let excludedVehicleExpensesCount = 0;
    let usedExchangeRateOnExpenses = false;

    for (const exp of rawVehExpenses) {
        const amt = Number(exp?.amount) || 0;
        if (!(amt > 0)) continue;
        const expCur = exp?.currency ? normalizeCurrency(exp.currency) : (rawCostCurrency || targetCurrency);
        const conv = toTargetCurrency(amt, expCur);
        if (conv.ok) {
            vehicleExpensesTotal = roundMoney(vehicleExpensesTotal + conv.amount);
            if (conv.converted) usedExchangeRateOnExpenses = true;
        } else {
            excludedVehicleExpensesCount += 1;
        }
    }
    if (excludedVehicleExpensesCount > 0) {
        missingFields.push('vehicleExpensesExchangeRate');
        missingReasons.push(
            `Falta conversión registrada entre ARS y USD para ${excludedVehicleExpensesCount} gasto(s) atribuible(s) al vehículo.`
        );
    }

    // Gastos comerciales de la venta (sale.saleExpenses)
    const rawSaleExpenses = Array.isArray(saleExpenses)
        ? saleExpenses
        : (Array.isArray(expenses) ? expenses : []);
    let saleExpensesTotal = 0;
    let excludedSaleExpensesCount = 0;

    for (const exp of rawSaleExpenses) {
        const amt = Number(exp?.amount) || 0;
        if (!(amt > 0)) continue;
        const expCur = exp?.currency ? normalizeCurrency(exp.currency) : targetCurrency;
        const conv = toTargetCurrency(amt, expCur);
        if (conv.ok) {
            saleExpensesTotal = roundMoney(saleExpensesTotal + conv.amount);
            if (conv.converted) usedExchangeRateOnExpenses = true;
        } else {
            excludedSaleExpensesCount += 1;
        }
    }
    if (excludedSaleExpensesCount > 0) {
        missingFields.push('saleExpensesExchangeRate');
        missingReasons.push(
            `Falta conversión registrada entre ARS y USD para ${excludedSaleExpensesCount} gasto(s) comercial(es) de la venta.`
        );
    }

    // Comisión (se conserva el porcentaje cargado; si el importe es 0 no bloquea por moneda heredada)
    const isPercentMode = commissionSettings?.mode === 'percent' &&
        commissionSettings?.percent !== undefined &&
        commissionSettings?.percent !== null &&
        String(commissionSettings.percent).trim() !== '';
    const savedPercent = isPercentMode ? parseDecimal(commissionSettings.percent) : null;

    let rawCommAmt = 0;
    let rawCommCur = targetCurrency;
    if (commissionAmount !== undefined && commissionAmount !== null) {
        rawCommAmt = roundMoney(Number(commissionAmount) || 0);
        rawCommCur = rawCommAmt > 0
            ? normalizeCurrency(commissionCurrency || (isPercentMode ? targetCurrency : commissionSettings?.extraCurrency) || targetCurrency)
            : targetCurrency;
    } else if (isPercentMode && Number.isFinite(savedPercent)) {
        rawCommAmt = computeCommissionAmount(agreedPrice, savedPercent);
        rawCommCur = targetCurrency;
    } else if (commissionSettings) {
        rawCommAmt = roundMoney(Number(commissionSettings.extraAmount) || 0);
        rawCommCur = rawCommAmt > 0
            ? normalizeCurrency(commissionSettings.extraCurrency || targetCurrency)
            : targetCurrency;
    }

    const commConv = toTargetCurrency(rawCommAmt, rawCommCur);
    const commissionComparable = commConv.ok;
    if (!commConv.ok) {
        missingFields.push('commissionExchangeRate');
        missingReasons.push(
            `Falta conversión registrada entre ${rawCommCur} y ${targetCurrency} para la comisión (${rawCommCur} ${rawCommAmt.toLocaleString('es-AR')}).`
        );
    }

    const calculable = missingReasons.length === 0;
    const excludedExpensesCount = excludedVehicleExpensesCount + excludedSaleExpensesCount;

    const resolvedInvestorPct = investorPercentage !== undefined
        ? Number(investorPercentage) || 0
        : Number(
            (vehObj?.investor?.percentage > 0 ? vehObj.investor.percentage : 0) ||
            (vehObj?.jointOwnership?.hasPartner && vehObj?.jointOwnership?.partnerPercentage > 0 ? vehObj.jointOwnership.partnerPercentage : 0) ||
            0
        );
    const cleanInvestorPct = Math.min(100, Math.max(0, roundMoney(resolvedInvestorPct)));
    const agencySharePct = roundMoney(100 - cleanInvestorPct);

    const acquisitionCost = costConv.ok ? costConv.amount : null;
    const totalExpenses = roundMoney(vehicleExpensesTotal + saleExpensesTotal);
    const profitBeforeCommission = calculable
        ? roundMoney(agreedPrice - acquisitionCost - vehicleExpensesTotal - saleExpensesTotal)
        : null;
    const resolvedCommissionAmount = commConv.ok ? commConv.amount : rawCommAmt;
    const netProfit = calculable
        ? roundMoney(profitBeforeCommission - resolvedCommissionAmount)
        : null;
    const investorProfitShare = calculable
        ? roundMoney((netProfit * cleanInvestorPct) / 100)
        : null;
    const agencyNetProfit = calculable
        ? roundMoney(netProfit - investorProfitShare)
        : null;

    return {
        calculable,
        statusLabel: calculable ? 'Calculada' : 'Ganancia no calculable',
        missingReasons,
        missingFields,
        currency: targetCurrency,
        exchangeRateUsed: validRate,
        convertedWithExchangeRate: Boolean(
            validRate && (costConv.converted || commConv.converted || usedExchangeRateOnExpenses)
        ),
        agreedPrice,
        acquisitionCost,
        rawAcquisitionCost: hasCost ? rawCost : null,
        rawAcquisitionCurrency: hasCost ? rawCostCurrency : null,
        acquisitionSource: costSource,
        acquisitionMismatch: costMismatch,
        vehicleExpensesTotal,
        saleExpensesTotal,
        totalExpenses,
        profitBeforeCommission,
        commissionAmount: resolvedCommissionAmount,
        rawCommissionAmount: rawCommAmt,
        rawCommissionCurrency: rawCommCur,
        commissionMode: isPercentMode ? 'percent' : 'fixed',
        commissionPercent: Number.isFinite(savedPercent) ? savedPercent : null,
        netProfit,
        investorPercentage: cleanInvestorPct,
        agencySharePercentage: agencySharePct,
        investorProfitShare,
        partnerNetProfit: investorProfitShare,
        agencyNetProfit,
        costComparable,
        commissionComparable,
        excludedVehicleExpensesCount,
        excludedSaleExpensesCount,
        excludedExpensesCount
    };
};

