import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';
const env = await bootIsolatedReplica();
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models), { Car } = env.models;
    const _id = new env.mongoose.Types.ObjectId();
    const raw = { _id, brand: 'QA Histórico', name: 'Datos pendientes', year: 2020, km: 1000,
        fuel: 'Nafta', condition: 'Usado', price: 15000000, currency: 'ARS', purchasePrice: 10000000,
        investor: { name: 'Inversor de prueba sin porcentaje' } };
    await Car.collection.insertOne(raw);
    const call = (method, route, body) => env.call(method, route, body, fixture.sessions[0].token);
    const detail = await call('GET', '/api/admin/cars/' + _id);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.status, undefined); assert.equal(detail.json.purchaseCurrency, undefined);
    const edited = await call('PATCH', '/api/admin/cars/' + _id, { notes: 'Nota sin completar hechos desconocidos.' });
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    const saved = await Car.collection.findOne({ _id });
    for (const field of ['status', 'purchaseCurrency', 'agencyOwned', 'purchasePaymentState']) assert.equal(Object.hasOwn(saved, field), false, field + ' must remain absent');
    assert.equal(Object.hasOwn(saved.investor, 'percentage'), false);
    assert.equal(saved.notes, 'Nota sin completar hechos desconocidos.');
    assert.equal(edited.json.status, undefined); assert.equal(edited.json.purchaseCurrency, undefined);
    const available = await call('GET', '/api/admin/cars?search=QA%20Hist%C3%B3rico');
    assert.equal(available.json.total, 0);
    const history = await call('GET', '/api/admin/cars?tab=historial&search=QA%20Hist%C3%B3rico');
    assert.equal(history.json.total, 1);
    const explicit = await call('PATCH', '/api/admin/cars/' + _id, { status: 'Disponible', purchaseCurrency: 'ARS' });
    assert.equal(explicit.status, 200, JSON.stringify(explicit.json));
    assert.equal((await Car.collection.findOne({ _id })).status, 'Disponible');
    assert.equal((await Car.collection.findOne({ _id })).purchaseCurrency, 'ARS');
    assert.equal((await call('GET', '/api/admin/cars?search=QA%20Hist%C3%B3rico')).json.total, 1);
    const newBase = { brand: 'QA Nueva', name: 'Moneda explícita', year: 2022, km: 20000,
        fuel: 'Nafta', condition: 'Usado', price: 17000000, currency: 'ARS', status: 'Disponible', agencyOwned: true, purchasePrice: 12000000 };
    const invalid = await call('POST', '/api/cars', newBase);
    assert.equal(invalid.status, 400, JSON.stringify(invalid.json));
    assert.equal(await Car.countDocuments({ brand: 'QA Nueva' }), 0);
    const correct = await call('POST', '/api/cars', { ...newBase, purchaseCurrency: 'ARS' });
    assert.equal(correct.status, 201, JSON.stringify(correct.json));
    const noCost = await call('POST', '/api/cars', { ...newBase, name: 'Sin costo conocido', purchasePrice: undefined });
    assert.equal(noCost.status, 201, JSON.stringify(noCost.json));
    const storedNoCost = await Car.collection.findOne({ _id: new env.mongoose.Types.ObjectId(noCost.json._id) });
    assert.equal(storedNoCost.purchaseCurrency, undefined);
    console.log('PASS: historical missing metadata stays absent through real GET/PATCH; explicit correction restores availability; new costs require an explicit currency; available units may retain a missing cost.');
} finally { await env.stop(); }
