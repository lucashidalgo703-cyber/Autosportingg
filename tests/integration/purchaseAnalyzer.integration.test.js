import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { registerPurchaseAnalyzer } from '../../src/routes/purchaseAnalyzerRoutes.js';
import { vehicle, terms, dashboard, listings } from '../fixtures/purchaseAnalyzerFixtures.js';

test('permisos, PIN, importación y persistencia del análisis en MongoDB aislada', async () => {
    const mongo = await MongoMemoryServer.create();
    const app = express();
    app.use(express.json());
    const Car = mongoose.model('AnalyzerTestCar', new mongoose.Schema({ name: String, purchasePrice: Number }));
    const Quote = mongoose.model('AnalyzerTestQuote', new mongoose.Schema({ quoteNumber: Number,
        tradeIn: { brand: String, model: String, year: Number, mileage: Number, condition: String } }));
    const Sale = mongoose.model('AnalyzerTestSale', new mongoose.Schema({ vehicleId: mongoose.Schema.Types.ObjectId,
        status: String, salePrice: Number, saleCurrency: String }));
    registerPurchaseAnalyzer(app, {
        authenticate(req, res, next) {
            const role = req.get('x-fixture-role');
            if (!role) return res.sendStatus(401);
            req.user = { role, username: 'propietario-sintético' };
            next();
        },
        unlockTreasury(req, res, next) {
            if (req.get('x-treasury-token') !== 'pin-verificado') return res.sendStatus(403);
            next();
        },
        isAuthorized: user => user.role === 'owner',
        Car, Quote, Sale, getDashboard: async () => dashboard
    });
    const server = app.listen(0, '127.0.0.1');
    try {
        await once(server, 'listening');
        await mongoose.connect(mongo.getUri());
        const car = await Car.create({ name: 'Corolla', purchasePrice: 18000 });
        const base = 'http://127.0.0.1:' + server.address().port + '/api/admin/tesoreria-estrategica/purchase-evaluations';
        const headers = { 'x-fixture-role': 'owner', 'x-treasury-token': 'pin-verificado', 'content-type': 'application/json' };
        assert.equal((await fetch(base)).status, 401);
        for (const role of ['seller', 'admin']) {
            assert.equal((await fetch(base, { headers: { ...headers, 'x-fixture-role': role } })).status, 403);
        }
        assert.equal((await fetch(base, { headers: { ...headers, 'x-treasury-token': '' } })).status, 403);
        assert.equal((await (await fetch(base + '/vehicle/' + car.id, { headers })).json()).name, 'Corolla');

        await Quote.create({ quoteNumber: 42, tradeIn: { brand: 'Toyota', model: 'Corolla', year: 2022, mileage: 42000 } });
        assert.equal((await fetch(base + '/quote/42', { headers: { ...headers, 'x-fixture-role': 'seller' } })).status, 403);
        assert.equal((await (await fetch(base + '/quote/42', { headers })).json()).tradeIn.mileage, 42000);
        const body = JSON.stringify({ vehicle, terms, quoteNumber: 42, listings: listings.map(row => ({ ...row, checkedAt: new Date().toISOString() })) });
        const response = await fetch(base, { headers, method: 'POST', body });
        assert.equal(response.status, 201);
        const evaluation = await response.json();
        assert.equal(evaluation.snapshot.market.publish, 22000);
        assert.equal(evaluation.snapshot.quoteNumber, 42);
        const unavailable = await fetch(base + '/' + evaluation._id + '/unavailable-listings', {
            headers, method: 'POST', body: JSON.stringify({ source: 'Mercado Libre Autos', listingId: 'MLA0000000' })
        });
        assert.equal(unavailable.status, 200);
        const link = await fetch(base + '/' + evaluation._id + '/vehicle', { headers, method: 'PUT', body: JSON.stringify({ vehicleRecord: car.id }) });
        assert.equal(link.status, 200);
        await Sale.create({ vehicleId: car._id, status: 'entregada', salePrice: 22000, saleCurrency: 'USD' });
        await mongoose.disconnect();
        await mongoose.connect(mongo.getUri());
        const current = await (await fetch(base + '/' + evaluation._id, { headers })).json();
        assert.deepEqual(current.snapshot, evaluation.snapshot);
        assert.equal(current.unavailableListings[0].listingId, 'MLA0000000');
        assert.equal(current.outcomes[1][0].salePrice, 22000);
        assert.equal((await (await fetch(base, { headers })).json()).length, 1);
    } finally {
        server.close();
        await mongoose.disconnect();
        await mongo.stop();
    }
});
