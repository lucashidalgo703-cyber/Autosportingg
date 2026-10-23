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

let treasuryToken;
const countSources = async () => Promise.all([
    Car.countDocuments(), Sale.countDocuments(), Account.countDocuments(), Transaction.countDocuments(), Installment.countDocuments(),
    TreasuryBox.countDocuments(), TreasuryConfig.countDocuments(), TreasuryReconciliation.countDocuments()
]);

await test('Acceso al endpoint requiere autenticación, rol privilegiado y PIN', async () => {
    const noPin = await call('GET', '/api/admin/capital-reinversion/projection', null, token);
    assert.equal(noPin.status, 403);
    assert.equal(noPin.json.requirePin, true);
    const cashier = await call('GET', '/api/admin/capital-reinversion/projection', null, makeToken('vendedor'), { 'x-treasury-token': 'invalid' });
    assert.equal(cashier.status, 403);
});

await test('Lee datos ficticios y devuelve DTO sin documentos ni campos privados', async () => {
    const setup = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', { pin: '4321', confirmPin: '4321' });
    assert.equal(setup.status, 200);
    treasuryToken = setup.json.treasuryToken;
    assert.ok(treasuryToken);

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
    const response = await call('GET', '/api/admin/capital-reinversion/projection', null, token, { 'x-treasury-token': treasuryToken });
    const after = await countSources();
    assert.equal(response.status, 200);
    assert.equal(response.json.ok, true);
    assert.equal(response.json.projection.demo, false);
    assert.equal(response.json.projection.operations.length, 1);
    assert.deepEqual(after, before, 'La consulta no debe crear ni modificar documentos');
    const serialized = JSON.stringify(response.json.projection);
    assert.equal(serialized.includes('private@example.test'), false);
    assert.equal(serialized.includes('NOTA PRIVADA'), false);
    assert.equal(serialized.includes('ownerEmail'), false);
    assert.equal(serialized.includes('purchasePaymentState'), false);
    assert.equal(serialized.includes('recoveryState'), false);
});

await test('Límite y falta de conciliación bloquean liquidez exacta', async () => {
    const response = await call('GET', '/api/admin/capital-reinversion/projection', null, token, { 'x-treasury-token': treasuryToken });
    assert.equal(response.status, 200);
    assert.equal(response.json.projection.liquidity.ARS.status, 'pendiente_conciliacion');
    assert.equal(response.json.projection.liquidity.ARS.availableForPurchase, null);
    assert.equal(response.json.projection.liquidity.USD.availableForPurchase, null);
});

await finish();
