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
    const read = async () => portalData(await env.models.Sale.findById(sale._id).lean(), { mode: 'with_trade_in' });
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    await test('the purchased vehicle uses the catalogue cover even after it is sold or hidden from the public inventory', async () => {
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { status: 'Vendido', sold: true, visibleEnWeb: false,
            coverImage: 'https://res.cloudinary.com/autosporting/image/upload/cover.jpg', images: ['/__fixture-media/buyer-duster.jpg'] } });
        const data = await read();
        assert.equal(data.purchasedVehicle.image, 'https://res.cloudinary.com/autosporting/image/upload/cover.jpg');
        assert.equal(data.purchasedVehicle.model, fixture.cars[4].name);
    });
    await test('the first safe car photo is used when the cover is absent, unsafe or agency artwork', async () => {
        const ownPhoto = '/__fixture-media/buyer-duster.jpg';
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $unset: { coverImage: '' }, $set: { images: [ownPhoto, '/__fixture-media/buyer-cronos.jpg'] } });
        assert.equal((await read()).purchasedVehicle.image, ownPhoto);
        for (const image of ['https://tracker.example.test/vehicle.jpg', 'javascript:alert(1)', '/api/admin/clients', '//tracker.example.test/photo.png']) {
            await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { coverImage: image } });
            assert.equal((await read()).purchasedVehicle.image, ownPhoto);
        }
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { coverImage: '/hero-autosporting.jpg', images: [
            'https://tracker.example.test/vehicle.jpg', '/agencia-autosporting.png', ownPhoto
        ] } });
        assert.equal((await read()).purchasedVehicle.image, ownPhoto);
    });
    await test('agency assets and missing media produce no vehicle photo and do not invent a fallback', async () => {
        const agencyAssets = ['/hero-autosporting.jpg', '/autosporting-hero.jpg', '/autosporting-hero-v2.jpg',
            '/agencia-autosporting.jpg', '/agencia-autosporting.png', '/logo-header-final-user.png',
            '/autosporting-logo-white.png', '/nested/LOGO-HEADER.png'];
        for (const image of agencyAssets) {
            await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { coverImage: image, images: agencyAssets } });
            assert.equal((await read()).purchasedVehicle.image, null);
        }
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $unset: { coverImage: '' }, $set: { images: [] } });
        assert.equal((await read()).purchasedVehicle.image, null);
        // A remote car photo is not rejected just because its filename happens
        // to resemble local marketing artwork.
        const remote = 'https://res.cloudinary.com/autosporting/image/upload/autosporting-hero-v2.jpg';
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { coverImage: remote } });
        assert.equal((await read()).purchasedVehicle.image, remote);
    });
    await test('both operation variants keep their purchased car photo isolated from the trade-in and the other sale', async () => {
        const otherSale = await env.models.Sale.findById(buyers.withoutTradeIn).lean();
        const tradeInCar = fixture.cars[0];
        const firstPhoto = '/__fixture-media/buyer-duster.jpg', secondPhoto = '/__fixture-media/buyer-cronos.jpg';
        const tradeInPhoto = '/__fixture-media/trade-in-only.jpg';
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $set: { coverImage: firstPhoto, images: [firstPhoto] } });
        await env.models.Car.updateOne({ _id: otherSale.vehicleId }, { $set: { coverImage: secondPhoto, images: [secondPhoto] } });
        await env.models.Car.updateOne({ _id: tradeInCar._id }, { $set: { coverImage: tradeInPhoto, images: [tradeInPhoto] } });
        await env.models.Sale.updateOne({ _id: sale._id }, { $set: { 'tradeIns.0.linkedStockCarId': tradeInCar._id } });
        const withTradeIn = await read(), withoutTradeIn = await portalData(otherSale, { mode: 'without_trade_in' });
        assert.equal(withTradeIn.purchasedVehicle.image, firstPhoto);
        assert.equal(withoutTradeIn.purchasedVehicle.image, secondPhoto);
        assert.notEqual(withTradeIn.purchasedVehicle.image, tradeInPhoto);
        assert.equal(withTradeIn.tradeIns[0].carId, String(tradeInCar._id));
        assert.deepEqual(withoutTradeIn.tradeIns, []);
        await env.models.Car.updateOne({ _id: sale.vehicleId }, { $unset: { coverImage: '' }, $set: { images: [] } });
        assert.equal((await read()).purchasedVehicle.image, null, 'other sale and trade-in photos cannot fill missing purchased media');
        assert.equal((await portalData(otherSale, { mode: 'without_trade_in' })).purchasedVehicle.image, secondPhoto);
        await env.models.Car.updateOne({ _id: otherSale.vehicleId }, { $unset: { coverImage: '' }, $set: { images: ['/hero-autosporting.jpg'] } });
        assert.equal((await portalData(otherSale, { mode: 'without_trade_in' })).purchasedVehicle.image, null);
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
        await env.models.Sale.updateOne({ _id: sale._id }, { $set: { expedienteStatus: 'en_proceso' } });
        const data = await read();
        assert.deepEqual(data.procedures, []);
        assert.equal(data.procedureStatus, 'en_proceso');
    });
    console.log(`PASS: ${passed} buyer portal experience scenarios.`);
} finally { await env.stop(); }
