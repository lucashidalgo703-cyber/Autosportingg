import assert from 'node:assert/strict';
import { calculateStockNegotiation, evaluateNegotiationOffer, negotiationIntermediatePrices } from '../src/utils/stockNegotiation.js';
import { computeCommissionAmount, computeSaleProfit } from '../src/utils/saleCommercial.js';

const owned = { _id: '000000000000000000000001', brand: 'Prueba', name: 'Unidad ficticia', price: 30000000, currency: 'ARS',
    purchasePrice: 20000000, purchaseCurrency: 'ARS', agencyOwned: true, status: 'Disponible', expenses: [{ concept: 'Service registrado', amount: 1000000, currency: 'ARS' }] };
const standard = { sellerPct: 1, consignationPct: .5, isSplit: false, mode: 'percent', percent: 1, extraAmount: 0, extraCurrency: 'USD', sourceLabel: 'Panel comercial de la venta' };
const minimum = { mode: 'amount', value: 2000000 };
const calculation = input => calculateStockNegotiation({ vehicle: structuredClone(owned), commissionSettings: standard, rule: minimum, ...input });
let passed = 0;
const test = (name, fn) => { fn(); console.log(`ok ${++passed} - ${name}`); };
function assertAuthorizedBoundary(result) {
    assert.ok(Number.isInteger(result.floor));
    assert.ok(evaluateNegotiationOffer(result, result.floor).profit >= result.minimumProfit);
    assert.ok(evaluateNegotiationOffer(result, result.floor - 1).profit < result.minimumProfit, 'one peso below cannot retain the required profit');
}

test('cash floor, exact floor and one peso below use the canonical price-dependent commission', () => {
    const result = calculation();
    assert.equal(result.totalCost, 21000000); assert.equal(result.floor, 23232324); assert.equal(result.status, 'ready');
    assertAuthorizedBoundary(result);
    assert.equal(evaluateNegotiationOffer(result, result.floor).message, 'Estás en el piso autorizado');
    assert.equal(evaluateNegotiationOffer(result, result.floor - 1).message, 'Requiere autorización: faltan $1 para llegar al piso');
    assert.equal(evaluateNegotiationOffer(result, result.floor + 100000).message, 'Podés cotizar y todavía podés bajar $100.000');
    assert.equal(result.steps.find(step => step.key === 'floor').profit, evaluateNegotiationOffer(result, result.floor).profit);
});
test('expenses are counted once from the vehicle, with no linked ledger double deduction', () => {
    const withLedgerCopies = { ...owned, transactions: [{ type: 'Egreso', amount: 1000000, currency: 'ARS' }] };
    const result = calculation({ vehicle: withLedgerCopies });
    assert.equal(result.totalCost, 21000000);
    assert.equal(result.steps[0].profit, computeSaleProfit({ salePrice: owned.price, saleCurrency: 'ARS', vehicle: owned,
        commissionAmount: computeCommissionAmount(owned.price, 1), commissionCurrency: 'ARS' }).netProfit);
});
test('current draft commercial expenses reuse canonical deduplication against the unit expenses', () => {
    const result = calculation({ saleExpenses: [{ description: ' Service REGISTRADO ', amount: 1000000, currency: 'ARS' },
        { description: 'Preparación comercial ya registrada', amount: 500000, currency: 'ARS' }] });
    assert.equal(result.totalCost, 21500000, 'matching unit expense counts once and an additional commercial expense counts once');
    assert.equal(evaluateNegotiationOffer(result, 28000000).profit, 6220000); assertAuthorizedBoundary(result);
    const currencyPending = calculation({ saleExpenses: [{ description: 'Gasto sin moneda', amount: 10 }] });
    assert.equal(currencyPending.floor, null); assert.ok(currencyPending.missingFields.some(value => value.field === 'saleExpenses.0.currency'));
    const exchangePending = calculation({ saleExpenses: [{ description: 'Gasto extranjero', amount: 10, currency: 'USD' }] });
    assert.equal(exchangePending.floor, null); assert.ok(exchangePending.missingFields.some(value => value.field === 'saleExpensesExchangeRate'));
});
test('a percentage minimum is based on the entire recorded investment', () => {
    const result = calculation({ rule: { mode: 'percent', value: 10 } });
    assert.equal(result.minimumProfit, 2100000); assertAuthorizedBoundary(result);
});
test('zero is an explicitly valid minimum, not a missing rule', () => {
    for (const mode of ['percent', 'amount']) { const result = calculation({ rule: { mode, value: 0 } }); assert.equal(result.status, 'ready'); assert.equal(result.minimumProfit, 0); assertAuthorizedBoundary(result); }
});
test('missing cost, currency, invalid expense and missing minimum do not authorize a floor', () => {
    for (const [change, expected] of [[{ vehicle: { ...owned, purchasePrice: undefined } }, 'purchasePrice'],
        [{ vehicle: { ...owned, purchaseCurrency: undefined } }, 'purchaseCurrency'],
        [{ vehicle: { ...owned, expenses: [{ concept: 'Gasto incompleto', amount: 1000 }] } }, 'expenses.0.currency'],
        [{ vehicle: { ...owned, expenses: [{ concept: 'Revisar importe', amount: -1, currency: 'ARS' }] } }, 'expenses.0.amount'],
        [{ rule: null }, 'minimumRule']]) {
        const result = calculation(change); assert.equal(result.floor, null); assert.equal(result.status, 'pending');
        assert.ok(result.missingFields.some(value => value.field === expected), JSON.stringify(result.missingFields));
        assert.equal(evaluateNegotiationOffer(result, 28000000).status, 'pending');
    }
});
test('known gain remains a projection when administration has not configured a minimum', () => {
    const result = calculation({ rule: null }); assert.equal(result.steps[0].profit, 8700000);
    assert.equal(evaluateNegotiationOffer(result, 28000000).profit, 6720000);
    assert.equal(result.floor, null);
});
test('purchase-payment and legacy trade-in costs reuse the existing acquisition rules', () => {
    const payment = calculation({ vehicle: { ...owned, purchasePrice: undefined, purchaseCurrency: undefined, purchasePaymentState: { totalCost: 20000000, currency: 'ARS' } } });
    assert.equal(payment.totalCost, 21000000); assert.equal(payment.floor, calculation().floor);
    const taken = calculation({ vehicle: { ...owned, purchasePrice: 99999999 }, legacyTradeInOrigin: { saleId: '000000000000000000000009', value: 20000000, currency: 'ARS' } });
    assert.equal(taken.totalCost, 21000000); assert.equal(taken.floor, calculation().floor);
});
test('shared gain uses the registered agreement, including 100% investor and no invented 50/50', () => {
    const shared = calculation({ vehicle: { ...owned, investor: { name: 'Socio ficticio', percentage: 35 }, agencyOwned: false } });
    assert.equal(shared.ownership.agencyPercent, 65); assert.equal(shared.ownership.shared, true);
    const projected = evaluateNegotiationOffer(shared, 28000000);
    assert.equal(projected.profit, 6720000); assert.equal(projected.agencyProfit, 4368000); assertAuthorizedBoundary(shared);
    const fullInvestor = calculation({ vehicle: { ...owned, investor: { percentage: 100 }, agencyOwned: false } });
    assert.equal(evaluateNegotiationOffer(fullInvestor, 28000000).agencyProfit, 0);
    const unknown = calculation({ vehicle: { ...owned, agencyOwned: false, jointOwnership: { hasPartner: true } } });
    assert.equal(unknown.floor, null); assert.equal(unknown.status, 'pending');
});
test('third-party capital percentage is not presented as a registered profit agreement', () => {
    for (const car of [{ ...owned, consignedBy: 'Titular ficticio' }, { ...owned, agencyOwned: false }]) {
        const result = calculation({ vehicle: car }); assert.equal(result.status, 'pending'); assert.equal(result.floor, null);
        assert.equal(result.ownership.agencyPercent, null); assert.equal(result.steps[0].agencyProfit, null);
        assert.ok(result.missingFields.some(value => value.field === 'profitParticipation'));
    }
});
test('published price below the actual floor is flagged without making up intermediate prices', () => {
    const result = calculation({ vehicle: { ...owned, price: 22000000 } });
    assert.equal(result.status, 'below_floor'); assert.equal(result.statusMessage, 'Revisar precio publicado');
    assert.deepEqual(result.steps.map(value => value.key), ['published', 'floor']); assertAuthorizedBoundary(result);
});
test('the quote ladder is distinct, descending and genuinely rounded even in tiny gaps', () => {
    assert.deepEqual(negotiationIntermediatePrices(101, 100), []);
    assert.deepEqual(negotiationIntermediatePrices(102, 100), [101]);
    assert.deepEqual(negotiationIntermediatePrices(103, 100), [102, 101]);
    for (let gap = 1; gap <= 500; gap++) {
        const values = negotiationIntermediatePrices(1000 + gap, 1000);
        assert.equal(new Set(values).size, values.length);
        assert.ok(values.length <= 2 && values.every(value => Number.isInteger(value) && value > 1000 && value < 1000 + gap));
        if (values.length === 2) assert.ok(values[0] > values[1]);
    }
    assert.ok(negotiationIntermediatePrices(30000000, 23000001).every(value => value % 1000000 === 0));
});
test('only the commercial panel commission is counted, without seller or split surcharges', () => {
    const ignored = { sellerPct: 99, consignationPct: 99, isSplit: true, mode: 'fixed', extraAmount: 0 };
    const zero = calculation({ commissionSettings: ignored });
    assert.equal(zero.floor, 23000000); assert.equal(zero.commission.effectivePercent, 0);
    assert.equal(evaluateNegotiationOffer(zero, 28000000).commissionAmount, 0); assertAuthorizedBoundary(zero);
    const defaultZero = calculation({ commissionSettings: null });
    assert.equal(defaultZero.floor, zero.floor); assert.equal(defaultZero.commission.fixedAmount, 0);
    const settings = { ...ignored, mode: 'percent', percent: 2, extraAmount: 99999999 };
    const result = calculation({ vehicle: { ...owned, price: 30000001 }, commissionSettings: settings });
    for (const price of [101, 301, 30000001, result.floor]) {
        assert.equal(evaluateNegotiationOffer(result, price).commissionAmount, computeCommissionAmount(price, 2));
    }
    assert.equal(evaluateNegotiationOffer(result, 101).commissionAmount, 2.02); assertAuthorizedBoundary(result);
});
test('fixed panel commission and original currencies require a recorded conversion', () => {
    const settings = { ...standard, mode: 'fixed', extraAmount: 100, extraCurrency: 'USD' };
    assert.equal(calculation({ commissionSettings: settings }).floor, null);
    const result = calculation({ commissionSettings: settings, exchangeRate: 1000 }); assert.equal(result.commission.fixedAmount, 100000); assertAuthorizedBoundary(result);
    const ars = calculation({ commissionSettings: { ...settings, extraAmount: 12345, extraCurrency: 'ARS' } });
    assert.equal(ars.floor, 23012345); assert.equal(evaluateNegotiationOffer(ars, 28000000).commissionAmount, 12345); assertAuthorizedBoundary(ars);
    const usd = { ...owned, currency: 'USD', price: 30000, purchasePrice: 20000, purchaseCurrency: 'USD', expenses: [] };
    assert.equal(calculation({ vehicle: usd }).floor, null, 'a nonzero ARS minimum is never treated as USD');
    const converted = calculation({ vehicle: usd, exchangeRate: 1000 }); assert.equal(converted.minimumProfit, 2000); assertAuthorizedBoundary(converted);
    assert.match(evaluateNegotiationOffer(converted, converted.floor - 1).message, /USD 1/);
});
test('mixed-currency cost preserves the per-expense rounding used in the commercial result', () => {
    const car = { ...owned, purchasePrice: 100, expenses: [{ concept: 'A', amount: .01, currency: 'USD' }, { concept: 'B', amount: .01, currency: 'USD' }] };
    const result = calculation({ vehicle: car, exchangeRate: 1.555, rule: { mode: 'amount', value: 1 } });
    assert.equal(result.totalCost, 100.04); assertAuthorizedBoundary(result);
    const aliases = calculation({ vehicle: { ...owned, currency: 'U$S', purchaseCurrency: 'DÓLARES', purchasePrice: 20000, price: 30000, expenses: [] }, rule: { mode: 'percent', value: 10 } });
    assert.equal(aliases.totalCost, 20000); assert.equal(aliases.currency, 'USD'); assertAuthorizedBoundary(aliases);
});
test('100 percent commissions, impossible ranges and invalid offers stop safely', () => {
    for (const settings of [{ ...standard, percent: 100 }, { ...standard, percent: 101 }, { ...standard, percent: undefined },
        { mode: 'fixed', extraAmount: -1 }, { ...standard, percent: 99.999999 }]) {
        const result = calculation({ commissionSettings: settings }); assert.equal(result.status, 'pending'); assert.equal(result.floor, null);
    }
    const upperBoundary = calculation({ vehicle: { ...owned, purchasePrice: 1e12, price: 1e12, expenses: [] }, rule: { mode: 'amount', value: 0 }, commissionSettings: null });
    assert.equal(upperBoundary.floor, 1e12); assertAuthorizedBoundary(upperBoundary);
    const impossible = calculation({ vehicle: { ...owned, purchasePrice: 1e12, price: 1e12, expenses: [] }, rule: { mode: 'amount', value: 1 }, commissionSettings: null });
    assert.equal(impossible.floor, null); assert.equal(impossible.status, 'pending');
    for (const value of [null, '', 0, -.01, .001, Infinity, NaN, 1e13]) assert.equal(evaluateNegotiationOffer(calculation(), value).status, 'pending');
});
test('the floor is the first qualifying integer even for very high panel percentages', () => {
    for (const settings of [{ ...standard, percent: 99.99 }, { ...standard, percent: .3333 }]) {
        const result = calculation({ vehicle: { ...owned, purchasePrice: 1.01, expenses: [], price: 20000 }, rule: { mode: 'amount', value: .05 }, commissionSettings: settings });
        assert.equal(result.status, 'ready');
        let first = null;
        for (let amount = 1; amount <= result.floor; amount++) if (evaluateNegotiationOffer(result, amount).profit >= .05) { first = amount; break; }
        assert.equal(result.floor, first, 'floor must be the first qualifying integer, not only a local qualifying integer');
        assertAuthorizedBoundary(result);
    }
});
test('all emitted prices and fractional offers preserve the effective minimum after panel rounding', () => {
    for (const percent of [0, .5, 33.33, 99.99]) {
        const result = calculation({ vehicle: { ...owned, purchasePrice: 17.68, price: 200000, expenses: [] },
            rule: { mode: 'amount', value: .01 }, commissionSettings: { ...standard, percent } });
        assertAuthorizedBoundary(result);
        assert.ok(result.steps.filter(step => step.key !== 'published').every(step => step.profit >= result.minimumProfit));
        for (let cents = 0; cents <= 200; cents++) {
            const offer = evaluateNegotiationOffer(result, result.floor + cents / 100);
            assert.ok(!['above_floor', 'at_floor'].includes(offer.status) || offer.profit >= result.minimumProfit);
        }
    }
});

test('the public calculation DTO never serializes the raw vehicle or buyer records', () => {
    const result = calculation({ vehicle: { ...owned, ownerPhone: 'PRIVATE', notes: 'PRIVATE' } });
    const json = JSON.stringify(result); assert.equal(json.includes('PRIVATE'), false); assert.equal(json.includes('_calculation'), false);
    assert.equal(evaluateNegotiationOffer(result, result.floor).status, 'at_floor');
});
console.log(`PASS: ${passed} stock negotiation calculation groups.`);
