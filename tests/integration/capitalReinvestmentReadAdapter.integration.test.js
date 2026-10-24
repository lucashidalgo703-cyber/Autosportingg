// Solo MongoDB en memoria; fixtures ficticios y autenticación temporal del harness.
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, token, makeToken } = await boot();
const { default: Car } = await import('../../src/models/Car.js');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Account } = await import('../../src/models/Account.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: Installment } = await import('../../src/models/Installment.js');
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { default: TreasuryConfig } = await import('../../src/models/TreasuryConfig.js');
const { default: TreasuryReconciliation } = await import('../../src/models/TreasuryReconciliation.js');
const { getCapitalReinvestmentProjection } = await import('../../src/services/capitalReinvestmentReadAdapter.js');

const countSources = async () => Promise.all([
    Car.countDocuments(), Sale.countDocuments(), Account.countDocuments(), Transaction.countDocuments(), Installment.countDocuments(),
    TreasuryBox.countDocuments(), TreasuryConfig.countDocuments(), TreasuryReconciliation.countDocuments()
]);

await test('La ruta de proyección está protegida con el contrato Owner-Only oficial', async () => {
    const unauth = await call('GET', '/api/admin/capital-reinversion/projection', null, null);
    assert.ok([401, 403].includes(unauth.status), 'sin token');
    assert.equal(Object.hasOwn(unauth.json, 'projection'), false);

    const vendedorRes = await call('GET', '/api/admin/capital-reinversion/projection', null, makeToken('vendedor'));
    assert.equal(vendedorRes.status, 403, 'rol vendedor');
    assert.equal(vendedorRes.json.code, 'ONLY_OWNER_ALLOWED');
    assert.equal(Object.hasOwn(vendedorRes.json, 'projection'), false);

    const noPinRes = await call('GET', '/api/admin/capital-reinversion/projection', null, token);
    assert.equal(noPinRes.status, 403, 'owner sin PIN');
    assert.equal(noPinRes.json.requirePin, true);
    assert.equal(Object.hasOwn(noPinRes.json, 'projection'), false);
});

await test('El adaptador de lectura produce DTO sin documentos ni campos privados', async () => {
    const setup = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', { pin: '4321', confirmPin: '4321' });
    assert.equal(setup.status, 200);
    assert.ok(setup.json.treasuryToken);

    const car = await Car.create({
        brand: 'Demo', name: 'Unidad Ficticia', year: 2022, km: 12000, fuel: 'Nafta', condition: 'Usado',
        price: 10000000, currency: 'ARS', purchasePrice: 8000000, purchaseCurrency: 'ARS', agencyOwned: true,
        purchasePaymentState: { status: 'pagado', modality: 'pagar_ahora', totalCost: 8000000, amountPaid: 8000000, pendingDebt: 0, currency: 'ARS', payments: [] },
        ownerEmail: 'private@example.test', notes: 'NOTA PRIVADA QUE NO DEBE SALIR'
    });
    await Sale.create({ vehicleId: car._id, status: 'confirmada', salePrice: 10000000, saleCurrency: 'ARS', saleDate: new Date('2026-01-01T00:00:00.000Z') });
    await Account.create({ name: 'Cuenta demo', type: 'Banco', currency: 'ARS', balance: 1000000, isActive: true });
    await TreasuryConfig.create({ isSetupCompleted: true });
    await TreasuryReconciliation.create({ status: 'confirmado', cutoffDate: new Date('2025-12-31T00:00:00.000Z') });

    const before = await countSources();
    const projection = await getCapitalReinvestmentProjection();
    const after = await countSources();
    assert.equal(projection.demo, false);
    assert.equal(projection.operations.length, 1);
    assert.deepEqual(after, before, 'La consulta no debe crear ni modificar documentos');
    const serialized = JSON.stringify(projection);
    assert.equal(serialized.includes('private@example.test'), false);
    assert.equal(serialized.includes('NOTA PRIVADA'), false);
    assert.equal(serialized.includes('ownerEmail'), false);
    assert.equal(serialized.includes('purchasePaymentState'), false);
    assert.equal(serialized.includes('recoveryState'), false);
});

await test('Límite y falta de conciliación bloquean liquidez exacta', async () => {
    const projection = await getCapitalReinvestmentProjection();
    assert.equal(projection.liquidity.ARS.status, 'pendiente_conciliacion');
    assert.equal(projection.liquidity.ARS.availableForPurchase, null);
    assert.equal(projection.liquidity.USD.availableForPurchase, null);
});

await test('Gasto anulado bloquea liquidez aunque exista asiento de reversa', async () => {
    const account = await Account.findOne({ currency: 'ARS' }).lean();
    const expense = await Transaction.create({
        type: 'Egreso', amount: 200000, currency: 'ARS', description: 'Gasto ficticio revertido',
        category: 'reparacion', accountId: account._id, status: 'anulado', date: new Date('2026-01-15T12:00:00.000Z')
    });
    await TreasuryBox.create({
        key: 'stock', name: 'Stock ficticio', isActive: true,
        history: [
            { type: 'egreso_finanzas', amount: 200000, currency: 'ARS', sourceExpenseId: expense._id },
            { type: 'reversion_egreso', amount: 200000, currency: 'ARS', sourceExpenseId: expense._id }
        ]
    });
    const projection = await getCapitalReinvestmentProjection();
    assert.ok(projection.warnings.some((warning) => warning.code === 'expense_reversal_balance_unverified'));
    assert.equal(projection.liquidity.ARS.availableForPurchase, null);
    assert.equal(projection.liquidity.ARS.accountCash, null);
    assert.equal(projection.sourceReconciliation.balanceIntegrity, 'unknown_expense_reversal');
    assert.equal(JSON.stringify(projection).includes(String(expense._id)), false);
});

await finish();
