import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
const fixture = await seedMobileCrm(env.models);
const { Car, Reservation, Sale, Lead, Transaction, Account } = env.models;
const actor = fixture.sessions[1].token;
const baseCar = { brand: 'Ficticio', name: 'Reserva atómica', year: 2023, km: 1, fuel: 'Nafta', condition: 'Usado',
    price: 1200, currency: 'U$S', purchasePrice: 900, purchaseCurrency: 'USD', status: 'Disponible', visibleEnWeb: false };
const car = extra => Car.create({ ...baseCar, ...extra });
const reserve = (vehicle, extra = {}) => ({ vehicleId: String(vehicle._id), clientId: String(fixture.client._id),
    agreedPrice: 1200, agreedCurrency: 'USD', depositAmount: 100, depositCurrency: 'USD', depositMethod: 'efectivo',
    expiresAt: new Date(Date.now() + 86400000).toISOString(), conditions: 'Condiciones ficticias', notes: 'Solo prueba aislada',
    salesperson: fixture.users[1].name, ...extra });
const sell = vehicle => ({ vehicleId: String(vehicle._id), clientId: String(fixture.client._id),
    salePrice: 1200, saleCurrency: 'USD', paymentMethod: 'contado' });
const call = (method, url, body) => env.call(method, url, body, actor);
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('OK - ' + name); };

try {
    await test('creación confirma reserva, stock, lead y auditoría sin generar un cobro', async () => {
        const vehicle = await car();
        const lead = await Lead.create({ name: 'Lead ficticio reserva', phone: '2974000011', vehicleId: vehicle._id });
        const transactions = await Transaction.countDocuments();
        const balances = await Account.find().sort({ _id: 1 }).select('balance').lean();
        const response = await call('POST', '/api/admin/reservations', reserve(vehicle, { leadId: String(lead._id) }));
        assert.equal(response.status, 201, JSON.stringify(response.json));
        assert.equal(response.json.conditions, 'Condiciones ficticias');
        assert.equal(response.json.reservationAuditLog[0].action, 'RESERVA_CREADA');
        assert.equal((await Car.findById(vehicle._id)).status, 'Reservado');
        assert.equal((await Lead.findById(lead._id)).crmStatus, 'reservado');
        assert.equal(await Transaction.countDocuments(), transactions);
        assert.deepEqual(await Account.find().sort({ _id: 1 }).select('balance').lean(), balances);
    });

    await test('reserva y venta simultáneas tienen un solo ganador sin reserva ni venta huérfanas', async () => {
        for (let i = 0; i < 3; i++) {
            const vehicle = await car();
            const responses = await Promise.all([
                call('POST', '/api/admin/reservations', reserve(vehicle)),
                call('POST', '/api/admin/sales', sell(vehicle))
            ]);
            assert.equal(responses.filter(response => response.status === 201).length, 1, JSON.stringify(responses));
            assert.ok(responses.some(response => response.status >= 400 && response.status < 500), JSON.stringify(responses));
            const stock = await Car.findById(vehicle._id);
            const activeSales = await Sale.countDocuments({ vehicleId: vehicle._id, status: { $ne: 'cancelada' } });
            const activeReservations = await Reservation.countDocuments({ vehicleId: vehicle._id, status: 'activa' });
            assert.equal(activeSales + activeReservations, 1);
            assert.equal(stock.status, activeSales ? 'Vendido' : 'Reservado');
            assert.equal(stock.sold, Boolean(activeSales));
        }
    });

    await test('dos reservas simultáneas dejan una sola reserva activa', async () => {
        const vehicle = await car();
        const responses = await Promise.all([call('POST', '/api/admin/reservations', reserve(vehicle)), call('POST', '/api/admin/reservations', reserve(vehicle))]);
        assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
        assert.equal(await Reservation.countDocuments({ vehicleId: vehicle._id }), 1);
        assert.equal((await Car.findById(vehicle._id)).status, 'Reservado');
    });

    await test('fallo al guardar stock revierte la reserva insertada', async () => {
        const vehicle = await car();
        const original = Car.prototype.save;
        Car.prototype.save = async function (...args) {
            if (String(this._id) === String(vehicle._id)) throw new Error('Fallo ficticio Car.save');
            return original.apply(this, args);
        };
        try {
            const response = await call('POST', '/api/admin/reservations', reserve(vehicle));
            assert.equal(response.status, 400);
            assert.equal(await Reservation.countDocuments({ vehicleId: vehicle._id }), 0);
            assert.equal((await Car.findById(vehicle._id)).status, 'Disponible');
        } finally { Car.prototype.save = original; }
    });

    await test('fallo tardío en lead revierte reserva y cambio de stock', async () => {
        const vehicle = await car();
        const lead = await Lead.create({ name: 'Lead ficticio rollback', phone: '2974000012', vehicleId: vehicle._id });
        const original = Lead.prototype.save;
        Lead.prototype.save = async function (...args) {
            if (String(this._id) === String(lead._id)) throw new Error('Fallo ficticio Lead.save');
            return original.apply(this, args);
        };
        try {
            const response = await call('POST', '/api/admin/reservations', reserve(vehicle, { leadId: String(lead._id) }));
            assert.equal(response.status, 400);
            assert.equal(await Reservation.countDocuments({ vehicleId: vehicle._id }), 0);
            assert.equal((await Car.findById(vehicle._id)).status, 'Disponible');
            assert.equal((await Lead.findById(lead._id)).crmStatus, 'nuevo');
        } finally { Lead.prototype.save = original; }
    });

    await test('la conversión manual se bloquea y una reserva convertida conserva la venta', async () => {
        const manualVehicle = await car();
        const manual = await call('POST', '/api/admin/reservations', reserve(manualVehicle));
        const blocked = await call('PATCH', `/api/admin/reservations/${manual.json._id}`, { status: 'convertida' });
        assert.equal(blocked.status, 409);
        assert.equal((await Reservation.findById(manual.json._id)).status, 'activa');
        assert.equal(await Sale.countDocuments({ vehicleId: manualVehicle._id }), 0);
        const converted = await call('POST', `/api/admin/reservations/${manual.json._id}/convert-to-sale`, { salePrice: 1200, saleCurrency: 'USD' });
        assert.equal(converted.status, 201, JSON.stringify(converted.json));
        const cancel = await call('PATCH', `/api/admin/reservations/${manual.json._id}`, { status: 'cancelada' });
        const reactivate = await call('PATCH', `/api/admin/reservations/${manual.json._id}`, { status: 'activa' });
        assert.equal(cancel.status, 409); assert.equal(reactivate.status, 409);
        const notes = await call('PATCH', `/api/admin/reservations/${manual.json._id}`, { notes: 'Nota permitida después de convertir' });
        assert.equal(notes.status, 200); assert.equal(notes.json.status, 'convertida');
        assert.equal((await Car.findById(manualVehicle._id)).status, 'Vendido');
        assert.equal(await Sale.countDocuments({ vehicleId: manualVehicle._id }), 1);
    });

    await test('anulación y conversión simultáneas mantienen un único estado consistente', async () => {
        for (let i = 0; i < 3; i++) {
            const vehicle = await car();
            const created = await call('POST', '/api/admin/reservations', reserve(vehicle));
            const responses = await Promise.all([
                call('PATCH', `/api/admin/reservations/${created.json._id}`, { status: 'cancelada' }),
                call('POST', `/api/admin/reservations/${created.json._id}/convert-to-sale`, { salePrice: 1200, saleCurrency: 'USD' })
            ]);
            assert.equal(responses.filter(response => response.status >= 200 && response.status < 300).length, 1, JSON.stringify(responses));
            const saved = await Reservation.findById(created.json._id);
            const vehicleAfter = await Car.findById(vehicle._id);
            const saleCount = await Sale.countDocuments({ vehicleId: vehicle._id });
            assert.ok(['convertida', 'cancelada'].includes(saved.status));
            assert.equal(vehicleAfter.status, saved.status === 'convertida' ? 'Vendido' : 'Disponible');
            assert.equal(saleCount, saved.status === 'convertida' ? 1 : 0);
        }
    });

    await test('una reserva cerrada no se reactiva y liberar stock también se revierte ante un fallo', async () => {
        const vehicle = await car();
        const created = await call('POST', '/api/admin/reservations', reserve(vehicle));
        const original = Car.prototype.save;
        Car.prototype.save = async function (...args) {
            if (String(this._id) === String(vehicle._id)) throw new Error('Fallo ficticio de liberación');
            return original.apply(this, args);
        };
        try {
            assert.equal((await call('PATCH', `/api/admin/reservations/${created.json._id}`, { status: 'cancelada', notes: 'No debe persistir' })).status, 400);
            assert.equal((await Reservation.findById(created.json._id)).status, 'activa');
            assert.equal((await Reservation.findById(created.json._id)).notes, 'Solo prueba aislada');
            assert.equal((await Car.findById(vehicle._id)).status, 'Reservado');
        } finally { Car.prototype.save = original; }
        assert.equal((await call('PATCH', `/api/admin/reservations/${created.json._id}`, { status: 'cancelada' })).status, 200);
        assert.equal((await call('PATCH', `/api/admin/reservations/${created.json._id}`, { status: 'activa' })).status, 409);
        assert.equal((await Car.findById(vehicle._id)).status, 'Disponible');
    });

    await test('stock incoherente con una venta activa no admite otra reserva', async () => {
        const vehicle = await car();
        assert.equal((await call('POST', '/api/admin/sales', sell(vehicle))).status, 201);
        await Car.updateOne({ _id: vehicle._id }, { status: 'Disponible', sold: false }); // Isolated legacy-data fixture only.
        assert.equal((await call('POST', '/api/admin/reservations', reserve(vehicle))).status, 409);
        assert.equal(await Reservation.countDocuments({ vehicleId: vehicle._id }), 0);
    });

    console.log(`${passed} pruebas de reserva atómica aprobadas en base local descartable.`);
} finally { await env.stop(); }
