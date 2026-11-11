import { roundMoney } from './saleCommercial.js';
import { saleTradeInComposition } from './saleWorkspace.js';

export function saleNonCashBuyerCredits(sale) {
    let externalPaid = 0, historicalSettled = 0, writtenOff = 0, ignoredCurrencyCount = 0;
    for (const row of sale.externalBuyerPayments || []) {
        const value = Number(row.amount); if (!Number.isFinite(value) || value <= 0) continue;
        if (row.currency !== sale.saleCurrency) { ignoredCurrencyCount++; continue; }
        externalPaid = roundMoney(externalPaid + value);
    }
    for (const row of sale.buyerBalanceAdjustments || []) {
        const value = Number(row.amount); if (!Number.isFinite(value) || value <= 0 || !['historical', 'settled'].includes(row.mode)) continue;
        if (row.currency !== sale.saleCurrency) { ignoredCurrencyCount++; continue; }
        if (row.mode === 'historical') historicalSettled = roundMoney(historicalSettled + value);
        else writtenOff = roundMoney(writtenOff + value);
    }
    return { externalPaid, historicalSettled, writtenOff, nonCashBuyerCredit: roundMoney(externalPaid + historicalSettled + writtenOff), ignoredCurrencyCount };
}

// Read-only commercial collections. An owner payment/expense is not a refund
// to the buyer, and a separately declared finance deposit is not applied here.
export function computeSaleCollection(sale, transactions = []) {
    const rows = transactions.filter(tx => tx.status === 'activo' && tx.currency === sale.saleCurrency);
    let income = 0, refunds = 0, hasDeposit = false, unclassifiedCount = 0;
    const confirmedDeposits = new Set((sale.depositRecords || []).filter(row => row.status === 'confirmada' && row.transactionId).map(row => String(row.transactionId)));
    for (const tx of rows) {
        const appliedDeposit = confirmedDeposits.has(String(tx._id));
        if ((tx.financeManualEntryId || tx.concept === 'finance_manual_deposit') && !appliedDeposit) continue;
        const text = `${tx.category || ''} ${tx.concept || ''} ${tx.description || ''}`;
        const source = ['venta', 'cuota', 'reserva'].includes(tx.source);
        const receipt = appliedDeposit || source || /cobro.{0,12}(venta|cuota)|pago.{0,12}comprador|seña|reserva/i.test(text);
        const amount = Number(tx.amount); if (!Number.isFinite(amount) || amount <= 0) continue;
        if (tx.type === 'Ingreso' && receipt) { income = roundMoney(income + amount); if (appliedDeposit || tx.source === 'reserva' || /seña|reserva/i.test(text)) hasDeposit = true; }
        else if (tx.type === 'Egreso' && /devoluci[oó]n.{0,30}(comprador|cliente|seña|reserva)|reintegro.{0,20}(comprador|cliente)|refund/i.test(text)) refunds = roundMoney(refunds + amount);
        else if (tx.type === 'Ingreso') unclassifiedCount++;
    }
    const depositApplied = !hasDeposit && sale.depositAppliedCurrency === sale.saleCurrency ? Number(sale.depositAppliedAmount || 0) : 0;
    const netoCobrado = roundMoney(income + depositApplied - refunds);
    const composition = saleTradeInComposition(sale);
    // Preserve legacy explicit stored credit if there are no detailed vehicles.
    const tradeInValue = (sale.tradeIns || []).length ? composition.credit : Number(sale.tradeInTotalAmount || 0);
    const totalToCollect = roundMoney(Math.max(0, Number(sale.salePrice || 0) - tradeInValue));
    const credits = saleNonCashBuyerCredits(sale);
    const pendingBalance = roundMoney(totalToCollect - netoCobrado - credits.nonCashBuyerCredit);
    const collectionStatus = netoCobrado >= totalToCollect ? (netoCobrado > totalToCollect && totalToCollect > 0 ? 'sobrecobrada' : 'cobrada') : netoCobrado > 0 ? 'parcial' : 'sin_cobro';
    return { netoCobrado, pendingBalance, collectionStatus, depositApplied, tradeInValue, totalToCollect, confirmedIncome: income, buyerRefunds: refunds, unclassifiedCount, unresolvedTradeInCount: composition.unresolved, ...credits, buyerPaymentsReceived: roundMoney(netoCobrado + credits.externalPaid), buyerBalanceStatus: pendingBalance <= 0 ? 'saldada' : pendingBalance < totalToCollect ? 'parcial' : 'pendiente' };
}
