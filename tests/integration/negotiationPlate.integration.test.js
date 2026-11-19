import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

// Additional boundaries beyond the invoice/plate end-to-end suite: preserve
// existing identifiers and refuse to hide contradictory live operations.
const env = await bootIsolatedReplica();
let passed = 0;
try {
    const { seedManagedRoles } = await import('../fixtures/managedRolesFixtures.js');
    const fixture = await seedManagedRoles(env.models);
    const { Car, Sale, Reservation, Transaction, AuditLog } = env.models;
    const seller = fixture.sessions[2].token;
    const createCar = extra => Car.create({ brand: 'DominioQA', name: 'Unidad ficticia', year: 2024, km: 2000,
        fuel: 'Nafta', condition: 'Usado', status: 'Disponible', sold: false, agencyOwned: true,
        price: 20000000, currency: 'ARS', purchasePrice: 14000000, purchaseCurrency: 'ARS', ...extra });
    const update = (car, plateOrVin = 'AB123CD') => env.call('PATCH', `/api/admin/stock/negotiation/${car._id}/plate`, { plateOrVin }, seller);
    const row = async car => {
        const result = await env.call('GET', '/api/admin/stock/negotiation?search=DominioQA&limit=100', undefined, seller);
        assert.equal(result.status, 200, JSON.stringify(result.json));
        return result.json.items.find(item => item.id === String(car._id));
    };
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };

    await test('empty or known placeholder identifiers can be completed without changing investment or cash', async () => {
        const transactionCount = await Transaction.countDocuments();
        for (const value of [undefined, null, '  ', 'S/D', 'Sin patente']) {
            const car = await createCar(value === undefined ? {} : { plateOrVin: value });
            const pending = await row(car); assert.equal(pending.canCompletePlate, true); assert.equal(pending.plate, '');
            const before = await Car.findById(car._id).lean();
            const result = await update(car, 'ab-123-cd'); assert.equal(result.status, 200, JSON.stringify(result.json));
            assert.equal(result.json.plate, 'AB123CD');
            const after = await Car.findById(car._id).lean();
            assert.equal(after.plateOrVin, 'AB123CD');
            for (const document of [before, after]) for (const field of ['plateOrVin', 'updatedAt', 'auditLog']) delete document[field];
            assert.deepEqual(after, before);
            assert.equal(await AuditLog.countDocuments({ action: 'DOMINIO_COMPLETADO', entityId: String(car._id) }), 1);
        }
        assert.equal(await Transaction.countDocuments(), transactionCount);
    });
    await test('VINs and unfamiliar recorded identifiers cannot be replaced from negotiation', async () => {
        for (const plateOrVin of ['8AFHR42EXJ1234567', 'ESPECIAL0123', 'ＡＢＣ１２３']) {
            const car = await createCar({ plateOrVin });
            assert.equal((await row(car)).canCompletePlate, false);
            const result = await update(car); assert.equal(result.status, 409, JSON.stringify(result.json));
            assert.equal((await Car.findById(car._id).lean()).plateOrVin, plateOrVin);
            assert.equal(await AuditLog.countDocuments({ action: 'DOMINIO_COMPLETADO', entityId: String(car._id) }), 0);
        }
    });
    await test('an active sale or live reservation prevents completion even when the car still says available', async () => {
        const sold = await createCar({ plateOrVin: '' });
        await Sale.create({ vehicleId: sold._id, clientId: fixture.clients[0]._id, salePrice: 20000000, saleCurrency: 'ARS', status: 'confirmada' });
        const reserved = await createCar({ plateOrVin: '' });
        await Reservation.create({ vehicleId: reserved._id, clientId: fixture.clients[0]._id, agreedPrice: 20000000, agreedCurrency: 'ARS',
            depositAmount: 10000, depositCurrency: 'ARS', depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000), status: 'activa' });
        for (const car of [sold, reserved]) {
            assert.equal((await row(car)).canCompletePlate, false);
            const result = await update(car); assert.equal(result.status, 409, JSON.stringify(result.json));
            assert.equal((await Car.findById(car._id).lean()).plateOrVin, '');
            assert.equal(await AuditLog.countDocuments({ action: 'DOMINIO_COMPLETADO', entityId: String(car._id) }), 0);
        }
        assert.equal((await env.call('GET', '/api/admin/auth/me', undefined, seller)).status, 200);
    });
    console.log(`PASS: ${passed} additional isolated plate boundaries; no employee accounts or production data.`);
} finally { await env.stop(); }
