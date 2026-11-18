import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    const { createLoginSession } = await import('../../src/services/authSessionService.js');
    const { Car, Sale, Transaction, Reservation, CrmSettings, AdminUser, StockNegotiationPolicy } = env.models;
    const admin = fixture.sessions[0].token, seller = fixture.sessions[1].token;
    const base = '/api/admin/stock/negotiation';
    const api = (method, route = '', body, token = admin) => env.call(method, base + route, body, token);
    const expect = (result, code) => assert.equal(result.status, code, JSON.stringify(result.json));
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const createCar = extra => Car.create({ brand: 'Negociación ficticia', name: 'Unidad propia', year: 2024, km: 1200,
        fuel: 'Nafta', condition: 'Usado', status: 'Disponible', sold: false, currency: 'ARS', price: 2000,
        purchasePrice: 990, purchaseCurrency: 'ARS', agencyOwned: true, visibleEnWeb: true,
        expenses: [{ concept: 'Gasto único de preparación', amount: 110, currency: 'ARS', paidBy: 'agency' }], ...extra });
    const own = await createCar({ plateOrVin: 'NEG001AA' });
    const shared = await createCar({ name: 'Unidad compartida', plateOrVin: 'NEG002AA', investor: { name: 'Socio ficticio', percentage: 40 } });
    const missing = await createCar({ name: 'Costo pendiente', plateOrVin: 'NEG003AA', purchasePrice: undefined });
    const usd = await createCar({ name: 'Moneda USD', plateOrVin: 'NEG004AA', currency: 'USD', purchaseCurrency: 'USD', purchasePrice: 1000, price: 2000, expenses: [] });
    const list = async (search = 'Negociación ficticia', token = seller) => { const result = await api('GET', '?search=' + encodeURIComponent(search), undefined, token); expect(result, 200); return result.json; };
    const item = async (car, token = seller) => (await list(car.plateOrVin, token)).items.find(value => value.id === String(car._id));

    await test('new negotiation permission does not grant broad financial access or configuration to sales', async () => {
        expect(await api('GET', '', undefined, null), 401);
        const plain = await AdminUser.create({ name: 'Sólo stock ficticio', email: 'stock-only@example.test', role: 'ventas', passwordHash: fixture.users[0].passwordHash, active: true, permissions: ['stock.read'] });
        const session = await createLoginSession(plain);
        expect(await api('GET', '', undefined, session.token), 200);
        expect(await api('GET', '', undefined, fixture.sessions[3].token), 403);
        const result = await api('GET', '', undefined, seller); expect(result, 200); assert.equal(result.json.canConfigure, false);
        expect(await api('PUT', '/rule', { rule: { mode: 'amount', value: 188 }, expectedRevision: 0 }, seller), 403);
        expect(await api('PUT', '/' + own._id + '/rule', { rule: { mode: 'amount', value: 188 }, expectedRevision: 0 }, seller), 403);
        expect(await env.call('GET', '/api/admin/accounts', undefined, seller), 403);
        const response = await fetch(env.base + base, { headers: { Authorization: 'Bearer ' + seller } });
        assert.match(response.headers.get('cache-control'), /private.*no-store/);
    });
    await test('without a saved rule the server leaves floors pending and never guesses zero minimum', async () => {
        const data = await item(own); assert.equal(data.status, 'pending'); assert.equal(data.floor, null);
        assert.equal(data.ruleSource, 'missing'); assert.ok(data.missingFields.some(field => /mínim/i.test(field.message)));
        expect(await api('PUT', '/rule', { rule: { mode: 'amount', value: -1 }, expectedRevision: 0 }), 400);
        expect(await api('PUT', '/rule', { rule: { mode: 'amount', value: 188 } }), 400);
        const saved = await api('PUT', '/rule', { rule: { mode: 'amount', value: 188 }, expectedRevision: 0 }); expect(saved, 200);
        assert.equal(saved.json.revision, 1);
    });
    await test('canonical acquisition plus one unit expense and the default zero commercial commission produce the exact authorized floor', async () => {
        await Transaction.create({ type: 'Egreso', module: 'crm_v2', amount: 110, currency: 'ARS', category: 'Preparación', description: 'Gasto único de preparación',
            accountId: fixture.accounts[0]._id, carId: own._id, vehicleId: own._id, status: 'activo' });
        const data = await item(own); assert.equal(data.totalCost, 1100, 'the mirrored account movement cannot duplicate car.expenses');
        assert.equal(data.floor, 1288); assert.equal(data.status, 'ready'); assert.equal(data.ruleSource, 'general');
        assert.ok(data.commission.sourceLabel.includes('sin comisión'));
        const exact = await api('POST', '/' + own._id + '/simulate', { amount: data.floor }, seller); expect(exact, 200);
        assert.equal(exact.json.status, 'at_floor'); assert.equal(exact.json.profit, 188); assert.equal(exact.json.commissionAmount, 0); assert.equal(exact.json.difference, 0);
        const oneLess = await api('POST', '/' + own._id + '/simulate', { amount: data.floor - 1 }, seller); expect(oneLess, 200);
        assert.equal(oneLess.json.status, 'below_floor'); assert.equal(oneLess.json.difference, 1);
        assert.match(oneLess.json.message, /Requiere autorización/);
    });
    await test('per-vehicle minimum takes priority, clearing it resumes the general policy and old editors cannot overwrite changes', async () => {
        const saved = await api('PUT', '/' + own._id + '/rule', { rule: { mode: 'percent', value: 25 }, expectedRevision: 0 }); expect(saved, 200);
        let data = await item(own); assert.equal(data.ruleSource, 'vehicle'); assert.equal(data.effectiveRule.value, 25); assert.ok(data.floor > 1288);
        expect(await api('PUT', '/' + own._id + '/rule', { rule: { mode: 'amount', value: 5 }, expectedRevision: 0 }), 409);
        expect(await api('DELETE', '/' + own._id + '/rule', { expectedRevision: saved.json.revision }), 200);
        data = await item(own); assert.equal(data.ruleSource, 'general'); assert.equal(data.floor, 1288); assert.equal(data.ruleRevision, 2);
        expect(await api('PUT', '/' + own._id + '/rule', { rule: { mode: 'amount', value: 5 }, expectedRevision: 0 }), 409);
        const attempts = await Promise.all([api('PUT', '/rule', { rule: { mode: 'amount', value: 190 }, expectedRevision: 1 }), api('PUT', '/rule', { rule: { mode: 'amount', value: 200 }, expectedRevision: 1 })]);
        assert.deepEqual(attempts.map(value => value.status).sort(), [200, 409]);
        const current = await list('', admin);
        expect(await api('PUT', '/rule', { rule: { mode: 'amount', value: 188 }, expectedRevision: current.ruleRevision }), 200);
    });
    await test('draft commercial expenses reuse canonical deduplication and never inherit expenses from cancelled sales', async () => {
        const car = await createCar({ name: 'Gastos comerciales borrador', plateOrVin: 'NEG008AA' });
        await Sale.create({ vehicleId: car._id, salePrice: 2000, saleCurrency: 'ARS', status: 'cancelada', saleExpenses: [{ description: 'Gasto de operación cancelada', amount: 999, currency: 'ARS' }] });
        assert.equal((await item(car)).totalCost, 1100);
        await Sale.create({ vehicleId: car._id, salePrice: 2000, saleCurrency: 'ARS', status: 'borrador', saleExpenses: [
            { description: 'Gasto único de preparación', amount: 110, currency: 'ARS' },
            { description: 'Gasto comercial de esta operación', amount: 50, currency: 'ARS' }
        ], commissionSettings: { sellerPct: 1, extraAmount: 0 } });
        const data = await item(car); assert.equal(data.totalCost, 1150); assert.equal(data.floor, 1338);
        const response = await api('POST', '/' + car._id + '/simulate', { amount: data.floor }, seller); expect(response, 200);
        assert.equal(response.json.profit, 188);
    });
    await test('shared units display whole-operation profit and AutoSporting share from the recorded agreement', async () => {
        const data = await item(shared); assert.equal(data.floor, 1288); assert.equal(data.ownership.agencyPercent, 60);
        const simulated = await api('POST', '/' + shared._id + '/simulate', { amount: data.floor }, seller); expect(simulated, 200);
        assert.equal(simulated.json.profit, 188); assert.equal(simulated.json.agencyProfit, 112.8);
        const unavailable = await item(missing); assert.equal(unavailable.status, 'pending'); assert.equal(unavailable.floor, null);
        assert.ok(unavailable.missingFields.some(value => /costo|compra|toma/i.test(value.message)));
    });
    await test('currency conversion uses only the saved CRM quotation and percentage minimums stay usable without guessing an exchange rate', async () => {
        let data = await item(usd); assert.equal(data.status, 'pending'); assert.equal(data.floor, null);
        expect(await api('PUT', '/' + usd._id + '/rule', { rule: { mode: 'percent', value: 10 }, expectedRevision: 0 }), 200);
        data = await item(usd); assert.equal(data.status, 'ready'); assert.equal(data.currency, 'USD');
        expect(await api('DELETE', '/' + usd._id + '/rule', { expectedRevision: data.ruleRevision }), 200);
        const { setManualDolarBlueRate } = await import('../../src/services/dolarService.js');
        // Exercise the existing settings writer, not a native collection bypass:
        // strict schemas must not silently discard the configured quotation.
        const previousFetch = globalThis.fetch;
        globalThis.fetch = async (...args) => {
            assert.match(String(args[0]), /^http:\/\/127\.0\.0\.1:/, 'no external exchange-rate request is allowed');
            return previousFetch(...args);
        };
        try { await setManualDolarBlueRate(1000); }
        finally { globalThis.fetch = previousFetch; }
        const saved = await CrmSettings.collection.findOne({});
        assert.equal(saved.dolarBlueConfig.rate, 1000); assert.equal(saved.dolarBlueConfig.compra, 1000);
        assert.equal(saved.dolarBlueConfig.isManual, true); assert.equal(saved.dolarBlueConfig.status, 'manual');
        assert.ok(saved.dolarBlueConfig.lastFetchedAt instanceof Date);
        const response = await list(usd.plateOrVin); data = response.items[0]; assert.equal(data.status, 'ready'); assert.equal(response.exchangeRate.rate, 1000);
        assert.ok(response.exchangeRate.lastFetchedAt);
    });
    await test('only the commercial panel commission applies, independently of seller and split-settlement percentages', async () => {
        const car = await createCar({ name: 'Panel comercial ficticio', plateOrVin: 'NEG009AA', purchasePrice: 1000, price: 2000, expenses: [] });
        const draft = await Sale.create({ vehicleId: car._id, salePrice: 2000, saleCurrency: 'ARS', status: 'borrador', commissionSettings: {
            sellerPct: 33.34, consignationPct: 33.33, isSplit: true, extraAmount: 0
        } });
        expect(await api('PUT', '/' + car._id + '/rule', { rule: { mode: 'amount', value: 10 }, expectedRevision: 0 }), 200);
        let quote = await item(car); assert.equal(quote.status, 'ready'); assert.equal(quote.floor, 1010);
        let response = await api('POST', '/' + car._id + '/simulate', { amount: quote.floor }, seller); expect(response, 200);
        assert.equal(response.json.profit, 10); assert.equal(response.json.commissionAmount, 0);

        await Sale.updateOne({ _id: draft._id }, { $set: { 'commissionSettings.mode': 'percent', 'commissionSettings.percent': 2 } });
        quote = await item(car); assert.equal(quote.floor, 1031); assert.match(quote.commission.sourceLabel, /Panel comercial.*borrador/);
        response = await api('POST', '/' + car._id + '/simulate', { amount: quote.floor }, seller); expect(response, 200);
        assert.equal(response.json.status, 'at_floor'); assert.equal(response.json.profit, 10.38); assert.equal(response.json.commissionAmount, 20.62);
        response = await api('POST', '/' + car._id + '/simulate', { amount: quote.floor - 1 }, seller); expect(response, 200);
        assert.equal(response.json.status, 'below_floor'); assert.ok(response.json.profit < 10);

        await Sale.updateOne({ _id: draft._id }, { $set: { 'commissionSettings.mode': 'fixed', 'commissionSettings.extraAmount': 35, 'commissionSettings.extraCurrency': 'ARS' } });
        quote = await item(car); assert.equal(quote.floor, 1045);
        response = await api('POST', '/' + car._id + '/simulate', { amount: quote.floor }, seller); expect(response, 200);
        assert.equal(response.json.profit, 10); assert.equal(response.json.commissionAmount, 35);

        await Sale.updateOne({ _id: draft._id }, { $set: { 'commissionSettings.mode': 'percent', 'commissionSettings.percent': 99.99 } });
        quote = await item(car); assert.equal(quote.status, 'below_floor'); assert.ok(Number.isInteger(quote.floor));
        response = await api('POST', '/' + car._id + '/simulate', { amount: quote.floor }, seller); expect(response, 200);
        assert.equal(response.json.status, 'at_floor'); assert.ok(response.json.profit >= 10);
        response = await api('POST', '/' + car._id + '/simulate', { amount: quote.floor - 1 }, seller); expect(response, 200);
        assert.equal(response.json.status, 'below_floor'); assert.ok(response.json.profit < 10);
    });
    await test('only available units can be simulated and contradictory active operations remain pending', async () => {
        const sold = await createCar({ name: 'No disponible', plateOrVin: 'NEG005AA', sold: true, status: 'Vendido' });
        assert.equal((await list(sold.plateOrVin)).items.length, 0);
        expect(await api('POST', '/' + sold._id + '/simulate', { amount: 2000 }, seller), 409);
        await Reservation.create({ vehicleId: own._id, clientId: fixture.client._id, status: 'activa', agreedPrice: 2000, agreedCurrency: 'ARS', depositAmount: 100,
            depositCurrency: 'ARS', depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000) });
        let data = await item(own); assert.equal(data.status, 'pending'); assert.equal(data.floor, null); assert.ok(data.missingFields.some(value => /reserva activa/.test(value.message)));
        const response = await api('POST', '/' + own._id + '/simulate', { amount: 999999 }, seller); expect(response, 200); assert.equal(response.json.status, 'pending');
        const draft = await Sale.create({ vehicleId: shared._id, salePrice: 2000, saleCurrency: 'ARS', status: 'borrador', commissionSettings: { sellerPct: 1, mode: 'percent', percent: 2 } });
        data = await item(shared); assert.equal(data.status, 'ready'); assert.match(data.commission.sourceLabel, /borrador/);
        await Sale.create({ vehicleId: shared._id, salePrice: 2100, saleCurrency: 'ARS', status: 'borrador' });
        data = await item(shared); assert.equal(data.status, 'pending'); assert.ok(data.missingFields.some(value => /más de una venta borrador/.test(value.message)));
        await Sale.updateOne({ _id: draft._id }, { $set: { status: 'confirmada' } });
        data = await item(shared); assert.equal(data.status, 'pending'); assert.ok(data.missingFields.some(value => /operación vigente/.test(value.message)));
    });
    await test('lookups and simulations do not alter stock, money, reservations or sales and policies never leak into public cars', async () => {
        const snapshot = async () => ({ cars: await Car.find({}).lean(), sales: await Sale.find({}).lean(), tx: await Transaction.find({}).lean(), reservations: await Reservation.find({}).lean(), accounts: await env.models.Account.find({}).lean(), settings: await CrmSettings.find({}).lean() });
        const before = await snapshot();
        await list('NEG003AA'); await api('POST', '/' + missing._id + '/simulate', { amount: 2000 }, seller);
        assert.deepEqual(await snapshot(), before);
        const cars = await env.call('GET', '/api/public/cars'); expect(cars, 200);
        assert.doesNotMatch(JSON.stringify(cars.json), /overrideRule|effectiveRule|ruleRevision|agencyProfit|negotiationPolicy/);
        assert.ok(await StockNegotiationPolicy.countDocuments() > 0);
        expect(await api('POST', '/' + usd._id + '/simulate', { amount: -1 }, seller), 400);
        expect(await api('GET', '?limit=1000000', undefined, seller), 400);
    });
    console.log(`PASS: ${passed} isolated stock negotiation integration scenarios; no production data or external quote fetches.`);
} finally { await env.stop(); }
