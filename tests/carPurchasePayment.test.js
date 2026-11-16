import assert from 'node:assert/strict';
import { getCarPurchasePaymentSummary } from '../src/utils/carPurchasePayment.js';
const base = { agencyOwned: true, purchasePrice: 20000000, purchaseCurrency: 'ARS', currency: 'ARS', price: 25000000 };
let passed = 0;
const test = (name, fn) => { fn(); console.log(`ok ${++passed} - ${name}`); };
test('a recorded USD amount remains USD even above the old magnitude threshold', () => {
    const summary = getCarPurchasePaymentSummary({ ...base, purchasePrice: 31188000, purchaseCurrency: 'USD' });
    assert.equal(summary.currency, 'USD'); assert.equal(summary.totalCost, 31188000); assert.equal(summary.agencyCost, 31188000);
});
test('a full-investor historical agreement retains 100% and creates no agency purchase debt', () => {
    const summary = getCarPurchasePaymentSummary({ ...base, agencyOwned: false,
        jointOwnership: { hasPartner: true, partnerPercentage: 100, partnerName: 'Inversor ficticio' }, purchasePaymentState: { status: 'pendiente' } });
    assert.equal(summary.partnerPercentage, 100); assert.equal(summary.agencyPercentage, 0); assert.equal(summary.agencyCost, 0); assert.equal(summary.partnerContribution, 20000000);
    assert.equal(summary.pendingDebt, 0); assert.equal(summary.status, 'pagado');
});
test('missing percentage, missing currency or conflicting contribution remains unknown and blocks payment calculation', () => {
    const missingPct = getCarPurchasePaymentSummary({ ...base, purchasePaymentState: { isSharedInvestment: true } });
    assert.equal(missingPct.calculationPending, true); assert.equal(missingPct.partnerPercentage, null); assert.equal(missingPct.agencyCost, null); assert.equal(missingPct.pendingDebt, null);
    const missingCurrency = getCarPurchasePaymentSummary({ ...base, purchaseCurrency: undefined });
    assert.equal(missingCurrency.currency, null); assert.equal(missingCurrency.pendingDebt, null); assert.equal(missingCurrency.calculationPending, true);
    const conflict = getCarPurchasePaymentSummary({ ...base, investor: { percentage: 100 }, jointOwnership: { currency: 'ARS', agencyCost: 5000000, partnerContribution: 15000000 } });
    assert.equal(conflict.calculationPending, true); assert.equal(conflict.agencyCost, null);
});
test('a real partial payment liquidates the registered agency contribution without changing the investor contribution', () => {
    const summary = getCarPurchasePaymentSummary({ ...base, investor: { name: 'Socio ficticio', percentage: 50 },
        purchasePaymentState: { status: 'parcial', isSharedInvestment: true, partnerPercentage: 50, totalCost: 20000000,
            agencyCost: 10000000, partnerContribution: 10000000, currency: 'ARS', amountPaid: 10000000,
            payments: [{ amount: 6000000, currency: 'ARS' }, { amount: 4000000, currency: 'ARS' }] } });
    assert.equal(summary.pendingDebt, 0); assert.equal(summary.status, 'pagado'); assert.equal(summary.amountPaid, 10000000); assert.equal(summary.agencyCost, 10000000);
});
test('a historical unit with known cost but no payment flow does not manufacture debt', () => {
    const summary = getCarPurchasePaymentSummary(base);
    assert.equal(summary.isHistorical, true); assert.equal(summary.status, 'conciliacion_pendiente'); assert.equal(summary.pendingDebt, 0); assert.equal(summary.calculationPending, false);
});
console.log(`PASS: ${passed} purchase-payment valuation groups.`);
