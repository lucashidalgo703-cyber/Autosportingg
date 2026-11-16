import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica({ listen: false });
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { seedBuyerPortalFixtures } = await import('../fixtures/buyerPortalFixtures.js');
    const { portalData } = await import('../../src/services/buyerPortalService.js');
    const fixture = await seedMobileCrm(env.models);
    const buyers = await seedBuyerPortalFixtures(env.models, fixture);
    const sale = await env.models.Sale.findById(buyers.withTradeIn).lean();
    const read = () => portalData(sale, { mode: 'with_trade_in' });
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    await test('the purchased vehicle uses the catalogue cover even after it is sold or hidden from the public inventory', async () => {
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { status: 'Vendido', sold: true, visibleEnWeb: false,
            coverImage: 'https://res.cloudinary.com/autosporting/image/upload/cover.jpg', images: ['/hero-autosporting.jpg'] } });
        const data = await read();
        assert.equal(data.purchasedVehicle.image, 'https://res.cloudinary.com/autosporting/image/upload/cover.jpg');
        assert.equal(data.purchasedVehicle.model, fixture.cars[4].name);
    });
    await test('the first catalogue image is used when no cover exists; unsafe or missing images are omitted', async () => {
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $unset: { coverImage: '' }, $set: { images: ['/hero-autosporting.jpg', '/agencia-autosporting.jpg'] } });
        assert.equal((await read()).purchasedVehicle.image, '/hero-autosporting.jpg');
        for (const image of ['https://tracker.example.test/vehicle.jpg', 'javascript:alert(1)', '/api/admin/clients', '//tracker.example.test/photo.png']) {
            await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { coverImage: image } });
            assert.equal((await read()).purchasedVehicle.image, null);
        }
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $unset: { coverImage: '' }, $set: { images: [] } });
        assert.equal((await read()).purchasedVehicle.image, null);
    });
    await test('every linked procedure keeps its own actual state without exposing internal notes or custom titles', async () => {
        const statuses = ['Pendiente', 'Documentación', 'Presentado', 'Observado', 'Transferido', 'Finalizado', 'Cancelado'];
        await env.models.Gestoria.deleteMany({ saleId: sale._id });
        for (const status of statuses) await env.models.Gestoria.create({ saleId: sale._id, title: 'TÍTULO INTERNO PRIVADO',
            type: 'Transferencia Egreso', status, notes: 'NOTA INTERNA PRIVADA', cost: 12345 });
        const data = await read();
        assert.equal(data.procedures.length, statuses.length);
        assert.deepEqual(data.procedures.map(item => item.status).sort(), [...statuses].sort());
        for (const item of data.procedures) {
            assert.equal(item.title, 'Transferencia Egreso');
            assert.deepEqual(Object.keys(item).sort(), ['id', 'title', 'type', 'status', 'updatedAt'].sort());
        }
        assert.doesNotMatch(JSON.stringify(data), /INTERNO PRIVADO|INTERNA PRIVADA|12345/);
    });
    await test('an operation without a linked procedure retains the commercial state instead of fabricating stages', async () => {
        await env.models.Gestoria.deleteMany({ saleId: sale._id });
        sale.expedienteStatus = 'en_proceso';
        const data = await read();
        assert.deepEqual(data.procedures, []);
        assert.equal(data.procedureStatus, 'en_proceso');
    });
    console.log(`PASS: ${passed} buyer portal experience scenarios.`);
} finally { await env.stop(); }
