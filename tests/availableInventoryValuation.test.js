import assert from 'node:assert/strict';
import { filterStockVehicles, isAvailableStock, stockOwnership, stockValuation, summarizeStock } from '../src/utils/inventoryStock.js';
const base = { brand: 'Ficticio', name: 'Unidad', year: 2022, status: 'Disponible', agencyOwned: true, currency: 'ARS', purchaseCurrency: 'ARS', price: 12000000, purchasePrice: 10000000 };
const car = (id, patch = {}) => ({ ...base, _id: id, plateOrVin: `TEST${id}`, ...patch });
let passed = 0;
const test = (name, fn) => { fn(); console.log(`ok ${++passed} - ${name}`); };
const available = cars => summarizeStock(cars.filter(isAvailableStock));
const three = [car('own'), car('shared', { purchasePrice: 20000000, price: 28000000, investor: { name: 'Socio ficticio', percentage: 50 } }),
    car('investor', { purchasePrice: 15000000, price: 18000000, investor: { name: 'Inversora ficticia', percentage: 100 } })];

test('mandatory 45M total = 20M agency + 25M investor, one vehicle per modality', () => {
    const m = available(three);
    assert.equal(m.count, 3); assert.equal(m.cost.ARS, 45000000); assert.equal(m.ownCost.ARS, 20000000); assert.equal(m.investorCost.ARS, 25000000);
    assert.deepEqual(m.countsByOwnership, { propio: 1, compartido: 1, inversor: 1, consignacion: 0, tercero: 0, sin_definir: 0 });
    assert.equal(m.asking.ARS, 58000000); assert.equal(m.ownAsking.ARS, 26000000); assert.equal(m.investorAsking.ARS, 32000000);
});
test('sold, reserved, paused, cancelled and unverifiable statuses never affect available totals; web visibility is independent', () => {
    const excluded = ['Vendido', 'Reservado', 'Señado', 'Pausado', 'Cancelado', null, undefined, ''].map((status, i) => car(`excluded${i}`, { status, purchasePrice: 999000000 }));
    assert.deepEqual(available([...three, ...excluded]), available(three));
    assert.equal(filterStockVehicles([...three, ...excluded], {}).length, 3);
    assert.equal(filterStockVehicles([...three, ...excluded], { tab: 'historial' }).length, 11);
    assert.equal(filterStockVehicles([car('hidden', { visibleEnWeb: false })], {}).length, 1);
});
test('reserving shared vehicle leaves 25M = 10M agency + 15M investor; returning available reinstates it once', () => {
    const reserved = three.map(c => c._id === 'shared' ? { ...c, status: 'Reservado' } : c);
    const m = available(reserved);
    assert.equal(m.count, 2); assert.equal(m.cost.ARS, 25000000); assert.equal(m.ownCost.ARS, 10000000); assert.equal(m.investorCost.ARS, 15000000);
    assert.equal(m.asking.ARS, 30000000); assert.equal(m.ownAsking.ARS, 12000000); assert.equal(m.investorAsking.ARS, 18000000);
    assert.deepEqual(available([...three, three[1]]), available(three));
});
test('cost and asking use their own recorded currencies, and expense attribution respects each side', () => {
    const c = car('cross', { purchasePrice: 15000, purchaseCurrency: 'USD', price: 25000000, investor: { percentage: 40 },
        expenses: [{ concept: 'Agencia', amount: 1000, currency: 'ARS', paidBy: 'agency' }, { concept: 'Inversor', amount: 50, currency: 'USD', paidBy: 'investor' },
            { concept: 'Acuerdo específico', amount: 100, currency: 'USD', paidBy: 'shared', agencyPercentage: 25 }] });
    const m = available([c]);
    assert.deepEqual(m.cost, { ARS: 1000, USD: 15150 }); assert.deepEqual(m.ownCost, { ARS: 1000, USD: 9025 }); assert.deepEqual(m.investorCost, { ARS: 0, USD: 6125 });
    assert.deepEqual(m.asking, { ARS: 25000000, USD: 0 }); assert.equal(m.breakdown.cost.length, 2);
    const credit = stockValuation(car('credit', { expenses: [{ concept: 'Devolución de gasto', amount: -1000, currency: 'ARS', paidBy: 'agency' }] }));
    assert.equal(credit.cost.ARS, 9999000); assert.equal(credit.ownCost.ARS, 9999000); assert.equal(credit.costComplete, true);
});
test('historical compartido100 and explicit purchase agreements retain real ownership without using commission', () => {
    assert.equal(stockOwnership(car('legacy', { agencyOwned: false, jointOwnership: { hasPartner: true, partnerPercentage: 100 } })).type, 'inversor');
    const c = car('agreement', { purchasePrice: 10000, investor: { percentage: 50 }, consignmentCommission: 2000,
        jointOwnership: { hasPartner: true, partnerPercentage: 50, agencyCost: 3000, partnerContribution: 7000, currency: 'ARS' } });
    const v = stockValuation(c); assert.equal(v.ownCost.ARS, 3000); assert.equal(v.externalCost.ARS, 7000); assert.equal(v.ownAsking, 6000000);
    assert.equal(stockValuation({ ...c, jointOwnership: { ...c.jointOwnership, agencyCost: '3.000', partnerContribution: '7.000' } }).ownCost.ARS, 3000);
    assert.equal(stockValuation(car('trade', { purchasePrice: 1, tradeInOrigin: { saleId: 'sale', value: 25000, currency: 'USD' } })).purchase, 25000);
});
test('missing cost, price, currency and percentage remain per-unit pending data, never fabricated zero or 50/50', () => {
    const c = car('missing', { purchasePrice: undefined, purchaseCurrency: undefined, currency: undefined, price: undefined, investor: { name: 'Socio sin porcentaje' } });
    const v = stockValuation(c), m = available([c]);
    assert.equal(v.purchase, null); assert.equal(v.asking, null); assert.equal(v.ownPct, null); assert.equal(v.askingCurrency, null);
    assert.equal(v.hasCost, false); assert.equal(v.hasPrice, false); assert.equal(m.count, 1); assert.equal(m.completeness.cost, false); assert.equal(m.completeness.asking, false);
    for (const field of ['purchasePrice', 'purchaseCurrency', 'price', 'currency', 'percentage']) assert.ok(m.pending.some(p => p.vehicleId === 'missing' && p.field === field));
    const unknown = available([car('unknown', { investor: { name: 'Socio', percentage: 101 } })]);
    assert.equal(unknown.cost.ARS, 10000000); assert.equal(unknown.unallocatedCost.ARS, 10000000); assert.equal(unknown.breakdown.cost[0].allocationComplete, false);
    const badExpense = stockValuation(car('badExpense', { expenses: [{ concept: 'Acuerdo inválido', amount: 100, currency: 'ARS', paidBy: 'shared', agencyPercentage: '' }] }));
    assert.equal(badExpense.unallocatedCost.ARS, 100); assert.equal(badExpense.ownCost.ARS, 10000000); assert.equal(badExpense.costComplete, false);
    const conflict = stockValuation(car('conflict', { investor: { percentage: 100 }, jointOwnership: { agencyCost: 1000, partnerContribution: 9999000, currency: 'ARS' } }));
    assert.equal(conflict.unallocatedCost.ARS, 10000000); assert.equal(conflict.costComplete, false); assert.ok(conflict.missingFields.some(field => field.field === 'capitalAgreement'));
});
test('unknown currency is never inferred from amount or another price; Argentine separators preserve magnitude', () => {
    const v = stockValuation(car('noCurrency', { purchaseCurrency: undefined, price: '59.188.000', currency: 'USD' }));
    assert.equal(v.purchaseCurrency, null); assert.equal(v.cost.ARS, 0); assert.equal(v.cost.USD, 0); assert.equal(v.hasCost, false);
    assert.equal(v.asking, 59188000); assert.equal(v.askingCurrency, 'USD');
    assert.equal(stockValuation(car('decimal', { purchasePrice: '10.000.000,25' })).purchase, 10000000.25);
});
test('mandates and consignment do not add agency/investor capital; published consignment stays separately identifiable', () => {
    const m = available([car('mandate', { agencyOwned: false }), car('consigned', { agencyOwned: false, consignedBy: 'Tercero ficticio' })]);
    assert.equal(m.count, 2); assert.equal(m.cost.ARS, 0); assert.equal(m.ownCost.ARS, 0); assert.equal(m.investorCost.ARS, 0);
    assert.equal(m.thirdPartyCost.ARS, 20000000); assert.equal(m.asking.ARS, 24000000); assert.equal(m.thirdPartyAsking.ARS, 24000000);
    assert.equal(m.breakdown.cost.every(row => row.excludedFromCapital), true);
});
test('every per-currency breakdown and modality reconciles in cents, without duplicate vehicle rows', () => {
    const m = available([...three, car('cents', { purchasePrice: 0.03, price: 0.07, investor: { percentage: 33.33 } })]);
    for (const currency of ['ARS', 'USD']) for (const kind of ['cost', 'asking']) {
        const rows = m.breakdown[kind].filter(r => r.currency === currency && !r.excludedFromCapital);
        const total = Math.round(rows.reduce((n, r) => n + r.total, 0) * 100) / 100;
        assert.equal(total, m[kind][currency]);
        for (const row of rows) assert.equal(Math.round((row.own + row.investor + row.thirdParty + row.unallocated) * 100) / 100, row.total);
        const groupSum = Object.values(m.ownershipMetrics).reduce((n, group) => n + group[kind][currency], 0);
        assert.equal(Math.round(groupSum * 100) / 100, m[kind][currency]);
    }
});
console.log(`PASS: ${passed} available inventory valuation groups.`);
