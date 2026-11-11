import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeSaleCollection } from '../src/utils/saleCollection.js';
import { computeOperationRecoveryState } from '../src/services/treasuryWaterfallHelpers.js';
const sale = { salePrice: 1000, saleCurrency: 'USD', depositAppliedAmount: 0 };
const transaction = overrides => ({ type: 'Ingreso', status: 'activo', amount: 100, currency: 'USD', source: 'venta', ...overrides });
test('pago propietario y seña de Caja independiente no extinguen saldo del comprador', () => {
    const rows = [transaction({}), transaction({ type: 'Egreso', amount: 900, category: 'Pago propietario' }), transaction({ amount: 800, source: 'manual', concept: 'finance_manual_deposit', financeManualEntryId: 'declaration' })];
    const collection = computeSaleCollection(sale, rows);
    assert.equal(collection.netoCobrado, 100); assert.equal(collection.pendingBalance, 900);
    const treasury = computeOperationRecoveryState({ sale, saleTransactions: rows });
    assert.equal(treasury.effectivelyCollectedCash, 100); assert.equal(treasury.pendingSaleBalance, 900);
});
test('seña legacy no se cuenta dos veces al existir ingreso de seña y devolución comprador explícita resta', () => {
    const collection = computeSaleCollection({ ...sale, depositAppliedAmount: 100, depositAppliedCurrency: 'USD' }, [transaction({ source: 'reserva', description: 'Seña' }), transaction({ type: 'Egreso', amount: 25, category: 'Devolución al comprador' }), transaction({ status: 'pendiente', amount: 1000 }), transaction({ currency: 'ARS', amount: 900000 })]);
    assert.equal(collection.depositApplied, 0); assert.equal(collection.netoCobrado, 75); assert.equal(collection.pendingBalance, 925);
});
test('permuta consignada explícita sin nombre mantiene capital de terceros y nunca pasa a propia', () => {
    const state = computeOperationRecoveryState({ sale, vehicle: { agencyOwned: false, tradeInOrigin: { saleId: 'origin', consigned: true, agencyOwned: false }, purchasePrice: 500, purchaseCurrency: 'USD' } });
    assert.equal(state.isConsignment, true);
});
test('pagos externos y constancias reducen sólo el pendiente, nunca caja o margen distribuible', () => {
    const declared = { ...sale, externalBuyerPayments: [{ amount: 200, currency: 'USD' }, { amount: 900000, currency: 'ARS' }], buyerBalanceAdjustments: [{ mode: 'historical', amount: 300, currency: 'USD' }, { mode: 'settled', amount: 400, currency: 'USD' }] };
    const result = computeSaleCollection(declared, [transaction({})]);
    assert.equal(result.netoCobrado, 100); assert.equal(result.externalPaid, 200); assert.equal(result.historicalSettled, 300); assert.equal(result.writtenOff, 400); assert.equal(result.pendingBalance, 0); assert.equal(result.buyerPaymentsReceived, 300); assert.equal(result.ignoredCurrencyCount, 1);
    const projected = computeOperationRecoveryState({ sale: declared, saleTransactions: [transaction({})] });
    assert.equal(projected.effectivelyCollectedCash, 100); assert.equal(projected.pendingSaleBalance, 0); assert.equal(projected.expectedCashTotal, 1000); assert.equal(projected.externalPaid, 200); assert.equal(projected.nonCashBuyerCredit, 900);
});
