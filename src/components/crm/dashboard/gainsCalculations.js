// Cálculo de los tres conceptos de ganancia del Dashboard / Cockpit CEO.
//
//  1. GANANCIA COMERCIAL  : margen devengado de cada venta (precio − costo − gastos − comisión − parte de socios).
//                           Se asigna al mes de la venta. Lo calcula computeSaleProfit (src/utils/saleCommercial.js).
//  2. GANANCIA COBRADA    : parte de ese margen respaldada por cobros reales. Se asigna al mes del cobro.
//                           Respeta la recuperación de capital, las permutas (no son efectivo) y la parte del socio.
//                           Si Tesorería ya distribuyó el cobro se usa treasuryBreakdown.marginCollected;
//                           si no, se estima con la misma cascada (capital primero, margen después).
//  3. GANANCIA DISTRIBUIDA: margen que Tesorería ya asignó a obligaciones, reservas o cajas
//                           (treasuryBreakdown.marginDistributed). Nunca se mezcla con las dos anteriores.
//
// Este módulo es puro (sin React ni acceso a base de datos): solo transforma los datos que recibe.

import { roundMoney } from '../../../utils/saleCommercial.js';

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export const normCurrency = (c) => (c === 'USD' || c === 'U$S' || c === 'US$' ? 'USD' : 'ARS');

const lc = (v) => String(v || '').trim().toLowerCase();

// Solo los movimientos efectivamente impactados cuentan como dinero. 'pendiente' no es dinero cobrado ni pagado.
export const isActiveTransaction = (t) => {
    const s = lc(t?.status);
    return s === '' || s === 'activo' || s === 'completado';
};

export const isIncomeTransaction = (t) => lc(t?.type) === 'ingreso';
export const isExpenseTransaction = (t) => lc(t?.type) === 'egreso';

// Distingue pagos de comisión, devoluciones a clientes y otros egresos (gastos, proveedores, etc.).
export const classifyExpenseTransaction = (t) => {
    const text = `${t?.category || ''} ${t?.concept || ''} ${t?.description || ''}`;
    if (/devoluci[oó]n|reintegro|reembolso/i.test(text)) return 'refund';
    if (/comisi[oó]n|comisiones/i.test(text)) return 'commission';
    return 'other';
};

// Convierte entre ARS y USD con una cotización explícita. Devuelve null si falta la cotización (nunca inventa una).
export const convertAmount = (amount, from, to, rate) => {
    const a = num(amount);
    const f = normCurrency(from);
    const t = normCurrency(to);
    if (a === 0 || f === t) return a;
    const r = num(rate);
    if (!(r > 0)) return null;
    return f === 'USD' ? roundMoney(a * r) : roundMoney(a / r);
};

// ¿El cobro ya fue procesado y distribuido oficialmente por Tesorería?
export const hasTreasuryDistribution = (t) => {
    if (!t || !t.isTreasuryDistributed || t.isTreasuryDistributionReversed) return false;
    const bd = t.treasuryBreakdown;
    if (!bd || typeof bd !== 'object') return false;
    return bd.schemeKey != null
        || num(bd.capitalRecoveredToStock) > 0
        || num(bd.marginCollected) > 0
        || num(bd.marginDistributed) > 0
        || num(bd.ownGrossAmount) > 0;
};

// Margen cobrado y margen distribuido de un cobro ya distribuido por Tesorería (en la moneda del cobro).
// IMPORTANTE: son conceptos distintos. marginDistributed NO es sustituto de marginCollected:
// con esquema pendiente hay margen cobrado y distribuido = 0; y los campos del modelo valen 0 por defecto.
export const readTreasuryMargins = (bd) => {
    const components = num(bd.essentialShortfallsCovered) + num(bd.reserveCovered)
        + num(bd.extraReinvestmentToStock) + num(bd.remainderDistributed);
    // Igual criterio que treasuryWaterfallHelpers: si marginDistributed vale 0 (documentos anteriores) se suman sus componentes.
    const distributed = num(bd.marginDistributed) > 0 ? num(bd.marginDistributed) : roundMoney(components);
    const reportedCollected = num(bd.marginCollected) > 0
        ? num(bd.marginCollected)
        : roundMoney(num(bd.distributableMargin) + num(bd.extraReinvestmentToStock));
    // Lo distribuido nunca puede superar lo cobrado.
    const collected = Math.max(reportedCollected, distributed);
    return { collected: roundMoney(collected), distributed: roundMoney(distributed) };
};

// Capital de permutas: el valor del vehículo recibido NO es efectivo; se resta de lo que el cobro debe recuperar.
export const resolveTradeInCapital = (sale, saleCurrency, saleRate) => {
    let total = roundMoney(num(sale?.tradeInTotalAmount));
    if (total === 0 && Array.isArray(sale?.tradeIns)) {
        for (const ti of sale.tradeIns) {
            const val = num(ti?.estimatedValue);
            if (val <= 0) continue;
            const conv = convertAmount(val, ti?.currency, saleCurrency, saleRate);
            if (conv !== null) total = roundMoney(total + conv);
        }
    }
    return total;
};

// Estado por venta para el cálculo de cobros. Todo en la moneda de la venta y sobre la parte propia de la agencia.
export const buildSaleGainState = ({ sale, commercialProfit, carData }) => {
    const saleCurrency = normCurrency(sale?.saleCurrency);
    const saleRate = num(sale?.exchangeRate) > 0 ? num(sale.exchangeRate) : null;
    const cp = commercialProfit || {};
    const calculable = Boolean(cp.calculable) && cp.agencyNetProfit !== null && cp.agencyNetProfit !== undefined;

    const agencyPct = calculable ? Math.min(1, Math.max(0, num(cp.agencySharePercentage) / 100)) : 0;
    const acquisition = num(cp.acquisitionCost);
    const expenses = num(cp.vehicleExpensesTotal) + num(cp.saleExpensesTotal);
    // La comisión se descuenta UNA sola vez: forma parte de lo que el cobro debe cubrir antes de liberar margen.
    const commission = num(cp.commissionAmount);
    const tradeInCapital = resolveTradeInCapital(sale, saleCurrency, saleRate);
    const totalCosts = roundMoney(acquisition + expenses + commission);

    const recoveryCash = calculable
        ? roundMoney(Math.max(0, (totalCosts - tradeInCapital) * agencyPct))
        : 0;

    return {
        saleId: String(sale?._id),
        sale,
        carData,
        commercialProfit: cp,
        calculable,
        missingReasons: cp.missingReasons || [],
        saleCurrency,
        saleRate,
        agencyPct,
        totalCosts,
        tradeInCapital,
        recoveryCash,
        agencyNetProfit: calculable ? num(cp.agencyNetProfit) : 0,
        // Acumulados (moneda de la venta)
        cashCollected: 0,
        recoveryConsumed: 0,
        marginCollectedSoFar: 0,
        marginDistributedSoFar: 0
    };
};

/**
 * Recorre los movimientos en orden cronológico y devuelve eventos de ganancia cobrada/distribuida.
 *
 * @param {Object}   p
 * @param {Map}      p.saleStates      saleId -> estado (buildSaleGainState)
 * @param {Array}    p.transactions    movimientos de Tesorería
 * @param {Function} p.resolveTxRate   (tx, date, saleState) => { rate, ...meta } cotización ARS/USD de la fecha del movimiento
 * @param {Array}    p.depositEvents   señas aplicadas a ventas sin movimiento propio (opcional)
 */
export function computeGainEvents({ saleStates, transactions = [], resolveTxRate, depositEvents = [] }) {
    const events = [];
    const reconciliation = {
        unlinkedIncomes: { count: 0, totalARS: 0, totalUSD: 0 },
        unconvertibleCashEvents: 0,
        ignoredPendingOrVoided: 0,
        commissionPayments: { count: 0 },
        refunds: { count: 0 },
        otherExpensesIgnored: 0,
        salesWithoutCalculableProfit: new Set(),
        salesWithCollectedAboveCommercial: []
    };

    const all = [
        ...transactions.map((t) => ({ kind: 'tx', t, date: new Date(t.date || t.createdAt || 0) })),
        ...depositEvents.map((d) => ({ kind: 'deposit', t: d, date: new Date(d.date) }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const item of all) {
        const t = item.t;
        const tDate = item.date;
        if (isNaN(tDate.getTime())) continue;

        if (!isActiveTransaction(t)) {
            reconciliation.ignoredPendingOrVoided++;
            continue;
        }
        const amt = num(t.amount);
        if (amt <= 0) continue;

        const txCurrency = normCurrency(t.currency);
        const state = t.saleId ? saleStates.get(String(t.saleId)) : null;
        const rateMeta = resolveTxRate(t, tDate, state) || {};

        // ---------- EGRESOS ----------
        if (isExpenseTransaction(t)) {
            if (!state) continue;
            const kind = classifyExpenseTransaction(t);
            if (kind === 'commission') {
                // El pago de una comisión NO revierte cobros: la comisión ya está descontada en la ganancia comercial.
                reconciliation.commissionPayments.count++;
                continue;
            }
            if (kind === 'other') {
                // Gastos ya contemplados en la ganancia comercial; tampoco son devolución de cobros.
                reconciliation.otherExpensesIgnored++;
                continue;
            }
            // Devolución al cliente: revierte primero margen y luego capital recuperado (el último dinero cobrado es margen).
            const inSaleCur = convertAmount(amt, txCurrency, state.saleCurrency, t.exchangeRate || state.saleRate || rateMeta.rate);
            if (inSaleCur === null || !state.calculable) { reconciliation.unconvertibleCashEvents++; continue; }
            const own = inSaleCur * state.agencyPct;
            const clawMargin = Math.min(state.marginCollectedSoFar, own);
            const clawRecovery = Math.min(state.recoveryConsumed, Math.max(0, own - clawMargin));
            state.cashCollected = Math.max(0, state.cashCollected - inSaleCur);
            state.marginCollectedSoFar = roundMoney(state.marginCollectedSoFar - clawMargin);
            state.recoveryConsumed = roundMoney(state.recoveryConsumed - clawRecovery);
            reconciliation.refunds.count++;
            const clawInTxCur = convertAmount(clawMargin, state.saleCurrency, txCurrency, t.exchangeRate || state.saleRate || rateMeta.rate) || 0;
            events.push({
                type: 'cash_refund', id: t._id, saleId: String(t.saleId), date: tDate, tx: t, state,
                txCurrency, amount: amt, rateMeta, basis: 'devolucion',
                collected: { amount: -clawInTxCur, currency: txCurrency },
                distributed: { amount: 0, currency: txCurrency },
                calculable: true, collectedSoFar: state.cashCollected
            });
            continue;
        }

        if (!isIncomeTransaction(t)) continue;

        // ---------- INGRESOS ----------
        if (!state) {
            // Ingreso sin venta vinculada: no se inventa margen. Solo se informa para conciliar.
            reconciliation.unlinkedIncomes.count++;
            const rate = num(t.exchangeRate) > 0 ? num(t.exchangeRate) : num(rateMeta.rate);
            const ars = convertAmount(amt, txCurrency, 'ARS', rate);
            const usd = convertAmount(amt, txCurrency, 'USD', rate);
            if (ars !== null) reconciliation.unlinkedIncomes.totalARS += ars;
            if (usd !== null) reconciliation.unlinkedIncomes.totalUSD += usd;
            continue;
        }

        const inSaleCur = convertAmount(amt, txCurrency, state.saleCurrency, t.exchangeRate || state.saleRate || rateMeta.rate);

        if (!state.calculable) {
            reconciliation.salesWithoutCalculableProfit.add(state.saleId);
            if (inSaleCur !== null) state.cashCollected += inSaleCur;
            events.push({
                type: 'cash_collection', id: t._id, saleId: state.saleId, date: tDate, tx: t, state,
                txCurrency, amount: amt, rateMeta, basis: 'sin_ganancia_calculable',
                collected: { amount: 0, currency: txCurrency }, distributed: { amount: 0, currency: txCurrency },
                calculable: false, missingReasons: state.missingReasons, collectedSoFar: state.cashCollected
            });
            continue;
        }

        if (inSaleCur === null) {
            reconciliation.unconvertibleCashEvents++;
            events.push({
                type: 'cash_collection', id: t._id, saleId: state.saleId, date: tDate, tx: t, state,
                txCurrency, amount: amt, rateMeta, basis: 'sin_cotizacion',
                collected: { amount: 0, currency: txCurrency }, distributed: { amount: 0, currency: txCurrency },
                calculable: false,
                missingReasons: [`Falta cotización para convertir el cobro de ${txCurrency} a ${state.saleCurrency}.`],
                collectedSoFar: state.cashCollected
            });
            continue;
        }

        state.cashCollected = roundMoney(state.cashCollected + inSaleCur);

        let collected;
        let distributed = 0;
        let basis;

        if (hasTreasuryDistribution(t)) {
            // Tesorería ya repartió el cobro: se respetan sus importes (en la moneda del cobro).
            const bd = t.treasuryBreakdown;
            const m = readTreasuryMargins(bd);
            collected = m.collected;
            distributed = m.distributed;
            basis = 'tesoreria';

            const ownGross = num(bd.ownGrossAmount) > 0 ? num(bd.ownGrossAmount) : Math.max(0, amt - num(t.thirdPartyAmount));
            const consumed = Math.max(0, ownGross - collected); // capital + obligaciones ya cubiertos por este cobro
            const toSale = (v) => convertAmount(v, txCurrency, state.saleCurrency, t.exchangeRate || state.saleRate || rateMeta.rate);
            const consumedSale = toSale(consumed);
            const collectedSale = toSale(collected);
            const distributedSale = toSale(distributed);
            if (consumedSale === null || collectedSale === null || distributedSale === null) {
                reconciliation.unconvertibleCashEvents++;
                state.cashCollected = roundMoney(state.cashCollected - inSaleCur);
                continue;
            }
            state.recoveryConsumed = roundMoney(state.recoveryConsumed + consumedSale);
            state.marginCollectedSoFar = roundMoney(state.marginCollectedSoFar + collectedSale);
            state.marginDistributedSoFar = roundMoney(state.marginDistributedSoFar + distributedSale);
        } else {
            // Cobro sin distribución oficial (o distribución revertida): cascada estimada.
            // 1) la parte propia primero recupera capital/costos; 2) recién después libera margen; 3) tope = ganancia comercial.
            const own = inSaleCur * state.agencyPct;
            const remRecovery = Math.max(0, state.recoveryCash - state.recoveryConsumed);
            const toRecovery = Math.min(own, remRecovery);
            const marginRaw = own - toRecovery;
            const remCap = Math.max(0, state.agencyNetProfit - state.marginCollectedSoFar);
            const marginSale = roundMoney(Math.min(marginRaw, remCap));
            state.recoveryConsumed = roundMoney(state.recoveryConsumed + toRecovery);
            state.marginCollectedSoFar = roundMoney(state.marginCollectedSoFar + marginSale);
            collected = convertAmount(marginSale, state.saleCurrency, txCurrency, t.exchangeRate || state.saleRate || rateMeta.rate);
            if (collected === null) collected = 0;
            basis = 'estimado_cascada';
        }

        events.push({
            type: item.kind === 'deposit' ? 'cash_deposit' : 'cash_collection',
            id: t._id, saleId: state.saleId, date: tDate, tx: t, state,
            txCurrency, amount: amt, rateMeta, basis,
            collected: { amount: collected, currency: txCurrency },
            distributed: { amount: distributed, currency: txCurrency },
            calculable: true,
            collectedSoFar: state.cashCollected
        });
    }

    // Conciliación: el cobrado (estimado) nunca debería superar la ganancia comercial de la operación.
    for (const st of saleStatesValues(saleStates)) {
        if (st.calculable && st.marginCollectedSoFar > st.agencyNetProfit + 0.01) {
            reconciliation.salesWithCollectedAboveCommercial.push({
                saleId: st.saleId,
                saleCurrency: st.saleCurrency,
                commercial: st.agencyNetProfit,
                collected: st.marginCollectedSoFar,
                difference: roundMoney(st.marginCollectedSoFar - st.agencyNetProfit)
            });
        }
    }
    reconciliation.salesWithoutCalculableProfit = [...reconciliation.salesWithoutCalculableProfit];
    reconciliation.unlinkedIncomes.totalARS = roundMoney(reconciliation.unlinkedIncomes.totalARS);
    reconciliation.unlinkedIncomes.totalUSD = roundMoney(reconciliation.unlinkedIncomes.totalUSD);

    return { events, reconciliation };
}

function saleStatesValues(map) {
    return Array.from(map.values());
}

// Convierte un importe en su moneda a { ars, usd } usando la cotización del evento.
// Si falta cotización, solo informa la moneda original y marca missingRate (no se inventa equivalencia).
export const toArsUsd = (amount, currency, rate) => {
    const cur = normCurrency(currency);
    const r = num(rate);
    if (cur === 'USD') {
        return { usd: roundMoney(amount), ars: r > 0 ? roundMoney(amount * r) : 0, missingRate: !(r > 0) };
    }
    return { ars: roundMoney(amount), usd: r > 0 ? roundMoney(amount / r) : 0, missingRate: !(r > 0) };
};
