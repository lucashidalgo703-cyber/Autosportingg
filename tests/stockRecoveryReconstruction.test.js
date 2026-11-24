import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStockRecovery } from '../src/services/stockRecoveryReconstruction.js';

const now = new Date('2026-11-24T20:00:00.000Z');
const car = (id, changes = {}) => ({ _id: id, createdAt: '2026-05-26T15:00:00.000Z', status: 'Disponible', sold: false,
    purchasePrice: 10000000, purchaseCurrency: 'ARS', price: 14000000, currency: 'ARS', agencyOwned: true, expenses: [], ...changes });
const recover = (input = {}) => buildStockRecovery({ from: '2026-05', through: '2026-10', now, ...input });
const month = (result, period = '2026-05') => result.rows.find(row => row.period === period);
const log = (field, oldValue, newValue, date = '2026-06-05T12:00:00Z', action = 'EDICION') => ({ field, oldValue, newValue, date, action });
const money = (row, currency = 'ARS', kind = 'cost') => row.stockCapital.byCurrency[currency][kind];

test('validates ranges and Argentina month cutoffs without inventing zeros for empty history', () => {
    const result = recover();
    assert.equal(result.rows.length, 6);
    assert.equal(result.rows[0].asOf, '2026-06-01T02:59:59.999Z');
    assert.equal(result.rows[5].asOf, '2026-11-01T02:59:59.999Z');
    assert.equal(money(result.rows[0]).total, null);
    assert.equal(result.rows[0].quality.status, 'partial');
    assert.throws(() => recover({ through: '2026-12' }), /rango histórico/);
    assert.throws(() => recover({ from: '2026-13' }), /rango histórico/);
    assert.equal(recover({ through: '2026-11' }).rows.at(-1).asOf, now.toISOString());
});

test('current costs, prices and ownership never masquerade as documented historical figures', () => {
    const original = car('a'); const before = JSON.stringify(original);
    const row = month(recover({ cars: [original] }));
    assert.equal(row.stockCapital.count, 1);
    assert.equal(row.recovery.coverage.availableInferred, 1);
    assert.equal(row.recovery.coverage.documentedCostVehicles, 0);
    assert.equal(money(row).total, null);
    assert.equal(money(row, 'ARS', 'published').total, null);
    assert.equal(row.recovery.estimates.stockCapital.byCurrency.ARS.cost.total, 10000000);
    assert.equal(row.recovery.estimates.stockCapital.byCurrency.ARS.published.total, 14000000);
    assert.equal(JSON.stringify(original), before);
    assert.equal(row.totalsByCurrency, undefined, 'No net capital is fabricated.');
    assert.equal(row.components, undefined);
});

test('reverses dated cost/asking/ownership/status audits and keeps ARS/USD separate', () => {
    const a = car('a', { status: 'Vendido', sold: true, soldAt: '2026-07-05T12:00:00Z', purchasePrice: 20000000,
        investor: { percentage: 50 }, auditLog: [
            log('status', 'Disponible', 'Vendido', '2026-07-05T12:00:00Z', 'ESTADO'),
            log('purchasePrice', 'ARS 10.000.000', 'ARS 20.000.000'),
            log('price', 'USD 14.000', 'ARS 14.000.000'),
            log('agencyOwned', true, true), log('investor.percentage', 20, 50)
        ] });
    const row = month(recover({ cars: [a] }));
    assert.equal(row.recovery.coverage.availableSupported, 1);
    assert.equal(row.recovery.coverage.documentedCostVehicles, 1);
    assert.equal(row.recovery.coverage.documentedOwnershipVehicles, 1);
    assert.equal(money(row).total, 10000000);
    assert.equal(money(row).own, 8000000);
    assert.equal(money(row).investors, 2000000);
    assert.equal(money(row, 'USD', 'published').total, 14000);
    assert.equal(money(row, 'ARS', 'published').total, 0);
    assert.equal(row.stockCapital.completeness.cost, false);
    assert.equal(row.quality.costStatus, 'partial', 'Documented values do not establish exhaustive lifecycle coverage.');
});

test('an audited amount without a dated currency cannot borrow today’s currency', () => {
    const row = month(recover({ cars: [car('a', { auditLog: [log('purchasePrice', 5000000, 10000000)] })] }));
    assert.equal(row.recovery.coverage.documentedCostVehicles, 0);
    assert.equal(money(row).total, null);
});

test('a lone historical agencyOwned false flag cannot prove third-party ownership or exclude the cost', () => {
    const a = car('a', { agencyOwned: true, auditLog: [
        log('agencyOwned', false, true), log('purchasePrice', 'ARS 10.000.000', 'ARS 10.000.000')
    ] });
    const row = month(recover({ cars: [a] }));
    assert.equal(row.recovery.coverage.documentedOwnershipVehicles, 0);
    assert.equal(row.recovery.coverage.missingOwnershipVehicles, 1);
    assert.equal(money(row).total, 10000000);
    assert.equal(money(row).unallocated, 10000000);
    assert.equal(money(row).thirdPartyExcluded, 0);
    assert.equal(money(row).own, null);
});

test('invalid or incomplete ownership snapshots remain unknown and documented purchase-state percentages stay usable without cost fallback', () => {
    const a = car('a', { purchasePaymentState: { isSharedInvestment: true, partnerPercentage: 25, totalCost: 999000000, currency: 'ARS' } });
    const row = month(recover({ cars: [a], anchors: [{ capturedAt: '2026-05-29', cars: [{ ...a, purchasePrice: undefined }] }] }));
    assert.equal(row.recovery.coverage.documentedOwnershipVehicles, 1);
    assert.equal(row.recovery.coverage.documentedCostVehicles, 0);
    assert.equal(money(row).total, null, 'The ownership snapshot does not authorize totalCost as a dated purchase-price source.');
    const invalid = month(recover({ cars: [car('b')], anchors: [{ capturedAt: '2026-05-29', cars: [car('b', { investor: { percentage: 125 } })] }] }));
    assert.equal(invalid.recovery.coverage.documentedOwnershipVehicles, 0);
    assert.equal(invalid.recovery.coverage.missingOwnershipVehicles, 1);
    assert.equal(money(invalid).total, 10000000);
    assert.equal(money(invalid).unallocated, 10000000);
});

test('future stock snapshots do not become historic proof; dated earlier snapshots can supply values', () => {
    const original = car('a');
    const input = { cars: [original], anchors: [{ capturedAt: '2026-11-16T17:28:00Z', cars: [original] }] };
    assert.equal(month(recover(input)).recovery.coverage.documentedCostVehicles, 0);
    const row = month(recover({ ...input, anchors: [{ capturedAt: '2026-05-29T17:28:00Z', cars: [original] }] }));
    assert.equal(money(row).total, 10000000);
    assert.equal(money(row).own, 10000000);
    assert.equal(row.recovery.coverage.documentedOwnershipVehicles, 1);
});

test('confirmed sales remove units at the cutoff, even if their current Car status is stale', () => {
    const a = car('a'); const b = car('b');
    const result = recover({ cars: [a, b], sales: [{ _id: 's', vehicleId: 'a', saleDate: '2026-05-30T12:00:00Z', status: 'confirmada' }] });
    const row = month(result);
    assert.equal(row.stockCapital.count, 1);
    assert.equal(row.recovery.vehicleEvidence.find(value => value.vehicleId === 'a').status, 'Vendido');
    assert.equal(row.recovery.vehicleEvidence.find(value => value.vehicleId === 'a').included, false);
});

test('sale reassignment and an audited reentry restore the correct physical vehicle interval', () => {
    const a = car('a', { auditLog: [log('status', 'Vendido', 'Disponible', '2026-07-10T12:00:00Z', 'ESTADO')] });
    const b = car('b', { status: 'Vendido', sold: true, soldAt: '2026-05-29T12:00:00Z', auditLog: [log('status', 'Disponible', 'Vendido', '2026-07-10T12:00:00Z', 'ESTADO')] });
    const sales = [{ _id: 's', vehicleId: 'b', status: 'confirmada', saleDate: '2026-05-29T12:00:00Z',
        vehicleChangeHistory: [{ date: '2026-07-10T12:00:00Z', previousVehicleId: 'a', newVehicleId: 'b' }] }];
    const result = recover({ cars: [a, b], sales });
    assert.equal(month(result).recovery.vehicleEvidence.find(value => value.vehicleId === 'a').included, false);
    assert.equal(month(result).recovery.vehicleEvidence.find(value => value.vehicleId === 'b').included, true);
    const july = month(result, '2026-07');
    assert.equal(july.recovery.vehicleEvidence.find(value => value.vehicleId === 'a').included, true);
    assert.equal(july.recovery.vehicleEvidence.find(value => value.vehicleId === 'b').included, false);
});

test('sale cancellations and reserved periods are evaluated historically, not from final status alone', () => {
    const sales = [{ vehicleId: 'a', saleDate: '2026-05-29T12:00:00Z', status: 'cancelada', cancelledAt: '2026-07-02T12:00:00Z',
        saleAuditLog: [log('status', 'confirmada', 'cancelada', '2026-07-02T12:00:00Z')] }];
    const reservations = [{ vehicleId: 'b', depositDate: '2026-06-05', expiresAt: '2026-08-01', status: 'cancelada',
        reservationAuditLog: [log('status', 'activa', 'cancelada', '2026-07-10T12:00:00Z')] }];
    const result = recover({ cars: [car('a'), car('b')], sales, reservations });
    assert.equal(month(result).stockCapital.count, 1);
    assert.equal(month(result, '2026-06').stockCapital.count, 0);
    assert.equal(month(result, '2026-07').stockCapital.count, 2);
});

test('missing dates/statuses and inconsistent imported intake dates do not silently become available', () => {
    const result = recover({ cars: [car('a', { createdAt: undefined }), car('b', { status: 'Pausado' }), car('c', { createdAt: '2026-10-01' })],
        sales: [{ vehicleId: 'c', saleDate: '2026-05-30', status: 'confirmada' }] });
    const row = month(result);
    assert.equal(row.stockCapital.count, 0);
    assert.equal(row.recovery.coverage.uncertainVehicles, 3);
    assert.equal(row.recovery.coverage.missingIntakeDate, 1);
    assert.equal(money(row).total, null);
});

test('creation-date corrections are reversed and erased current dates can be recovered from oldValue', () => {
    const result = recover({ cars: [car('a', { createdAt: '2026-10-01', auditLog: [log('createdAt', '2026-05-26T12:00:00Z', '2026-10-01', '2026-10-02')] })] });
    assert.equal(month(result).stockCapital.count, 1);
    assert.equal(month(result).recovery.vehicleEvidence[0].intakeDate, '2026-05-26T12:00:00.000Z');
});

test('trash snapshots recover deleted vehicles only before deletion and never double-count restored cars', () => {
    const a = car('a');
    const trash = [{ entityType: 'Car', entityId: 'a', snapshot: a, createdAt: '2026-07-10T12:00:00Z' }];
    const result = recover({ trash });
    assert.equal(month(result).stockCapital.count, 1);
    assert.equal(month(result, '2026-07').stockCapital.count, 0);
    assert.equal(month(recover({ cars: [a], trash })).stockCapital.count, 1);
});

test('dated purchase invoices document cost but cannot invent the owner/investor split', () => {
    const row = month(recover({ cars: [car('a')], invoices: [{ carId: 'a', direction: 'purchase', invoiceDate: '2026-05-30', totalAmount: 11000, currency: 'USD', status: 'active' }] }));
    assert.equal(money(row, 'USD').total, 11000);
    assert.equal(money(row, 'USD').unallocated, 11000);
    assert.equal(money(row, 'USD').own, null);
    assert.equal(money(row, 'USD').investors, null);
    assert.equal(row.recovery.coverage.documentedCostVehicles, 1);
    assert.equal(row.recovery.coverage.documentedOwnershipVehicles, 0);
});

test('invoices edited after cutoff cannot substitute today’s amount/date/currency for historical values', () => {
    for (const field of ['totalAmount', 'currency', 'invoiceDate']) {
        const row = month(recover({ cars: [car('a')], invoices: [{ carId: 'a', direction: 'purchase', invoiceDate: '2026-05-30', totalAmount: 11000, currency: 'USD', status: 'active',
            history: [{ at: '2026-08-01', changes: { [field]: field === 'totalAmount' ? 11000 : 'USD' } }] }] }));
        assert.equal(row.recovery.coverage.documentedCostVehicles, 0, field);
    }
    const row = month(recover({ cars: [car('a')], invoices: [{ carId: 'a', direction: 'purchase', invoiceDate: '2026-06-01', totalAmount: 11000, currency: 'USD', status: 'active' }] }));
    assert.equal(row.recovery.coverage.documentedCostVehicles, 0, 'June first business date is not May in Argentina.');
});

test('expense arrays are rolled back before filtering; unaudited present-day expenses remain estimates only', () => {
    const old = { _id: 'e', concept: 'Repuesto', amount: 50, currency: 'USD', date: '2026-05-30', paidBy: 'agency' };
    const updated = { ...old, amount: 500 };
    const a = car('a', { expenses: [updated], auditLog: [log('expenses', [old], [updated], '2026-07-01')] });
    const row = month(recover({ cars: [a] }));
    assert.equal(money(row, 'USD').total, 50);
    assert.equal(money(row, 'USD').own, 50);
    assert.equal(row.recovery.estimates.stockCapital.byCurrency.USD.cost.total, 50);
    const unverified = month(recover({ cars: [car('b', { expenses: [updated] })] }));
    assert.equal(money(unverified, 'USD').total, null);
    assert.equal(unverified.recovery.coverage.unverifiedExpenses, 1);
    assert.equal(unverified.recovery.estimates.stockCapital.byCurrency.USD.cost.total, 500);
});

test('dated expense-addition audits support accrued expenses and exclude later backdated additions', () => {
    const before = { _id: 'e1', concept: 'Antes', amount: 30, currency: 'USD', date: '2026-05-29' };
    const after = { _id: 'e2', concept: 'Después', amount: 70, currency: 'USD', date: '2026-05-30' };
    const a = car('a', { expenses: [before, after], auditLog: [
        log('expenses', undefined, before, '2026-05-29T17:00:00Z', 'GASTO'),
        log('expenses', undefined, after, '2026-06-05T17:00:00Z', 'GASTO')
    ] });
    const row = month(recover({ cars: [a] }));
    assert.equal(money(row, 'USD').total, 30);
    assert.equal(row.recovery.estimates.stockCapital.byCurrency.USD.cost.total, 30);
});

test('duplicate global/embedded audit evidence does not duplicate vehicles or expense values or leak PII', () => {
    const change = log('price', 'ARS 10.000', 'ARS 20.000', '2026-06-01T12:00:00Z');
    const original = car('a', { brand: 'MarcaPrivada', ownerPhone: 'telefono-privado', investor: { name: 'persona-privada', percentage: 50 }, auditLog: [change] });
    const row = month(recover({ cars: [original, original], audits: [{ entityId: 'a', entityType: 'Car', createdAt: change.date, metadata: { changes: [change] } }] }));
    assert.equal(row.stockCapital.count, 1);
    assert.equal(money(row, 'ARS', 'published').total, 10000);
    assert.doesNotMatch(JSON.stringify(row), /MarcaPrivada|telefono-privado|persona-privada/);
});

test('malformed legacy arrays are ignored with warnings instead of crashing or confirming invoice values', () => {
    const result = recover({ cars: [car('a', { auditLog: { field: 'price' }, expenses: 'ilegible' })],
        sales: [{ vehicleId: 'a', saleDate: '2026-07-01', status: 'cancelada', vehicleChangeHistory: {}, saleAuditLog: 'x', tradeIns: {} }],
        reservations: [{ vehicleId: 'a', depositDate: '2026-07-01', expiresAt: '2026-07-10', reservationAuditLog: {} }],
        audits: [{ entityType: 'Car', entityId: 'a', createdAt: '2026-06-01', metadata: { changes: {} } }],
        invoices: [{ carId: 'a', direction: 'purchase', invoiceDate: '2026-05-30', totalAmount: 999000000, currency: 'ARS', history: 'ilegible' }] });
    const row = month(result);
    assert.equal(row.stockCapital.count, 1);
    assert.equal(row.recovery.coverage.documentedCostVehicles, 0);
    assert.equal(money(row).total, null);
    assert.equal(row.recovery.coverage.unreadableHistories, 8);
    assert.ok(row.recovery.warnings.some(warning => /ilegible/.test(warning)));
    assert.ok(row.recovery.vehicleEvidence[0].warnings.some(warning => /ilegible/.test(warning)));
    assert.doesNotThrow(() => recover({ cars: null, sales: {}, reservations: 'x', audits: [null, 'x'] }));
    assert.doesNotThrow(() => recover({ cars: [car('b', { expenses: [null, 'x'], auditLog: [log('expenses', [null, 'x'], [], '2026-06-01')] })] }));
});
