import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { boot } from './harness.js';
import Car from '../../src/models/Car.js';
import Client from '../../src/models/Client.js';
import Sale from '../../src/models/Sale.js';
import Installment from '../../src/models/Installment.js';
import Account from '../../src/models/Account.js';
import Transaction from '../../src/models/Transaction.js';
import {
    prepareDeviceForOffline,
    getOfflineSnapshot,
    enqueueOfflineOperation,
    syncOfflineOutbox,
    clearOfflineData
} from '../../src/services/offlineSyncService.js';

// Memory storage mock para verificar aislamiento por usuario y limpieza
function createMemoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        key: (i) => Array.from(map.keys())[i] || null,
        get length() {
            return map.size;
        }
    };
}

const { call: apiCall, test, finish, base: baseUrl } = await boot();
console.log('Etapa 4 — Uso del CRM sin Conexión (Modo Offline v1)');

await test('Preparación del dispositivo: descarga stock, clientes, ventas, cuotas y gastos autorizados sin exponer Tesorería Estratégica privada y soporta opción con/sin fotos', async () => {
    const acc = await Account.create({
        name: 'Banco Principal ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 5000000,
        isActive: true
    });

    const car = await Car.create({
        brand: 'Chevrolet',
        name: 'Cruze LTZ',
        year: 2022,
        km: 28000,
        fuel: 'Nafta',
        condition: 'Usado',
        currency: 'ARS',
        price: 24000000,
        purchasePrice: 19500000,
        status: 'Disponible',
        coverImage: 'https://res.cloudinary.com/demo/image/upload/v1/cruze_main.jpg',
        images: [
            'https://res.cloudinary.com/demo/image/upload/v1/cruze_1.jpg',
            'https://res.cloudinary.com/demo/image/upload/v1/cruze_2.jpg'
        ]
    });

    const client = await Client.create({
        firstName: 'Martín',
        lastName: 'Pereyra',
        fullName: 'Martín Pereyra',
        phone: '1155667788',
        email: 'martin@test.local'
    });

    const sale = await Sale.create({
        vehicleId: car._id,
        clientId: client._id,
        salePrice: 24000000,
        saleCurrency: 'ARS',
        paymentMethod: 'financiado',
        status: 'confirmada'
    });

    await Installment.create({
        saleId: sale._id,
        vehicleId: car._id,
        clientId: client._id,
        installmentNumber: 1,
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        amount: 2000000,
        currency: 'ARS',
        status: 'pendiente'
    });

    await Transaction.create({
        type: 'Egreso',
        category: 'Mantenimiento',
        concept: 'Alineación y balanceo Cruze',
        description: 'Alineación y balanceo Cruze',
        amount: 85000,
        currency: 'ARS',
        accountId: acc._id,
        vehicleId: car._id,
        status: 'activo'
    });

    const storage = createMemoryStorage();
    const progressSteps = [];

    const fetcher = async (path, opts = {}) => {
        return await fetch(`${baseUrl}${path}`, {
            ...opts,
            headers: {
                ...(opts.headers || {}),
                Authorization: `Bearer ${jwt.sign(
                    { id: 'user_owner_1', username: 'owner_test', role: 'owner' },
                    process.env.JWT_SECRET,
                    { expiresIn: '2h' }
                )}`
            }
        });
    };

    // 1. Preparar con fotos
    const bundleWithPhotos = await prepareDeviceForOffline({
        userId: 'user_owner_1',
        includePhotos: true,
        onProgress: (p) => progressSteps.push(p),
        fetchImpl: fetcher,
        customStorage: storage
    });

    assert.equal(bundleWithPhotos.treasuryStrategicExcluded, true, 'Nunca debe incluir datos privados de Tesorería Estratégica');
    assert.equal(bundleWithPhotos.summary.vehiclesCount, 1);
    assert.equal(bundleWithPhotos.summary.clientsCount, 1);
    assert.equal(bundleWithPhotos.summary.salesCount, 1);
    assert.equal(bundleWithPhotos.summary.installmentsCount, 1);
    assert.equal(bundleWithPhotos.summary.expensesCount, 1);
    assert.ok(bundleWithPhotos.data.vehicles[0].coverImage, 'Con includePhotos=true debe conservar la foto principal');
    assert.ok(progressSteps.some(s => s.percent === 100));

    // 2. Preparar sin fotos
    const bundleNoPhotos = await prepareDeviceForOffline({
        userId: 'user_owner_1',
        includePhotos: false,
        fetchImpl: fetcher,
        customStorage: storage
    });
    assert.equal(bundleNoPhotos.data.vehicles[0].coverImage, null, 'Con includePhotos=false no debe almacenar fotos');
    assert.equal(bundleNoPhotos.data.vehicles[0].images.length, 0);
});

await test('Cola offline e idempotencia: observaciones, peritajes, borradores de cliente y gastos de unidad se aplican una sola vez sin duplicarse en reintentos', async () => {
    const car = await Car.findOne({ name: 'Cruze LTZ' });
    const storage = createMemoryStorage();

    // Encolar las 4 operaciones operativas mientras está sin conexión
    const opObs = enqueueOfflineOperation('user_owner_1', {
        idempotencyKey: 'idem_obs_001',
        operationType: 'observation',
        entityType: 'Car',
        entityId: String(car._id),
        expectedUpdatedAt: car.updatedAt.toISOString(),
        payload: {
            vehicleId: String(car._id),
            note: 'Cubiertas delanteras al 80%, auxilio sin rodar.'
        }
    }, storage);

    const opAppraisal = enqueueOfflineOperation('user_owner_1', {
        idempotencyKey: 'idem_app_001',
        operationType: 'appraisal',
        entityType: 'Car',
        entityId: String(car._id),
        payload: {
            vehicleId: String(car._id),
            valuation: 20500000,
            currency: 'ARS',
            conditionNotes: 'Pintura de fábrica en todos los paneles'
        }
    }, storage);

    const opClient = enqueueOfflineOperation('user_owner_1', {
        idempotencyKey: 'idem_cli_001',
        operationType: 'client_draft',
        entityType: 'Client',
        payload: {
            fullName: 'Lucía Fernández',
            phone: '1144556677',
            notes: 'Interesada en permuta por SUV'
        }
    }, storage);

    const opExpense = enqueueOfflineOperation('user_owner_1', {
        idempotencyKey: 'idem_exp_001',
        operationType: 'expense',
        entityType: 'Car',
        entityId: String(car._id),
        payload: {
            vehicleId: String(car._id),
            concept: 'Lavado de tapizado en campo',
            amount: 45000,
            currency: 'ARS'
        }
    }, storage);

    const snapBefore = getOfflineSnapshot('user_owner_1', storage);
    assert.equal(snapBefore.outbox.length, 4);

    // Sincronizar con el servidor
    const syncRes1 = await apiCall('POST', '/api/admin/offline/sync', {
        operations: [opObs, opAppraisal, opClient, opExpense]
    });
    assert.equal(syncRes1.status, 200, JSON.stringify(syncRes1.json));
    assert.equal(syncRes1.json.summary.appliedCount, 4);
    assert.equal(syncRes1.json.summary.duplicateCount, 0);

    // Verificar impacto real en base de datos
    const carAfter1 = await Car.findById(car._id);
    assert.ok(carAfter1.notes.includes('Cubiertas delanteras al 80%'));
    assert.equal(carAfter1.consignmentValuation, 20500000);
    assert.equal(carAfter1.expenses.length, 1);
    assert.equal(carAfter1.expenses[0].amount, 45000);

    const clientsCount1 = await Client.countDocuments({ fullName: 'Lucía Fernández' });
    assert.equal(clientsCount1, 1);

    // Reenviar exactamente las mismas 4 operaciones (simulación de caída de red y reintento) -> idempotencia estricta
    const syncRes2 = await apiCall('POST', '/api/admin/offline/sync', {
        operations: [opObs, opAppraisal, opClient, opExpense]
    });
    assert.equal(syncRes2.status, 200);
    assert.equal(syncRes2.json.summary.appliedCount, 0);
    assert.equal(syncRes2.json.summary.duplicateCount, 4);
    assert.ok(syncRes2.json.results.every(r => r.deduplicated === true));

    // Comprobar que NO se duplicó ni el cliente ni el gasto del vehículo
    const carAfter2 = await Car.findById(car._id);
    assert.equal(carAfter2.expenses.length, 1, 'No debe duplicar el gasto en reintento idempotente');
    const clientsCount2 = await Client.countDocuments({ fullName: 'Lucía Fernández' });
    assert.equal(clientsCount2, 1, 'No debe duplicar el cliente en reintento idempotente');
});

await test('Detección de conflictos y protección contable: cambios en el servidor generan conflicto claro sin pisar datos, y borradores financieros quedan pendientes de confirmación sin alterar saldos', async () => {
    const car = await Car.findOne({ name: 'Cruze LTZ' });
    const inst = await Installment.findOne({ vehicleId: car._id });
    const acc = await Account.findOne({ currency: 'ARS' });
    const accBalanceBefore = acc.balance;

    // Fecha de descarga offline simulada ANTERIOR a la última modificación del vehículo en el servidor
    const staleTimestamp = new Date(car.updatedAt.getTime() - 60000).toISOString();

    const conflictOp = {
        idempotencyKey: 'idem_conflict_001',
        operationType: 'observation',
        entityType: 'Car',
        entityId: String(car._id),
        expectedUpdatedAt: staleTimestamp,
        payload: {
            vehicleId: String(car._id),
            note: 'Intento de edición sobre copia desactualizada'
        }
    };

    // Borrador financiero (intento de cobro de cuota cargado offline) -> debe requerir confirmación explícita del servidor sin tocar cuenta ni cuota
    const financialDraftOp = {
        idempotencyKey: 'idem_fin_draft_001',
        operationType: 'financial_draft',
        entityType: 'InstallmentPaymentDraft',
        entityId: String(inst._id),
        payload: {
            draftKind: 'installment_payment',
            installmentId: String(inst._id),
            accountId: String(acc._id),
            amount: 2000000,
            currency: 'ARS'
        }
    };

    const syncRes = await apiCall('POST', '/api/admin/offline/sync', {
        operations: [conflictOp, financialDraftOp]
    });
    assert.equal(syncRes.status, 200, JSON.stringify(syncRes.json));
    assert.equal(syncRes.json.summary.conflictCount, 1);
    assert.equal(syncRes.json.summary.pendingConfirmationCount, 1);

    const conflictResult = syncRes.json.results.find(r => r.idempotencyKey === 'idem_conflict_001');
    assert.equal(conflictResult.status, 'conflict');
    assert.equal(conflictResult.conflictDetails.reason, 'MODIFIED_ON_SERVER');

    const finResult = syncRes.json.results.find(r => r.idempotencyKey === 'idem_fin_draft_001');
    assert.equal(finResult.status, 'pending_confirmation');
    assert.equal(finResult.requiresServerConfirmation, true);

    // Verificar que ni el saldo de la cuenta ni el estado de la cuota cambiaron automáticamente desde la cola offline
    const accAfter = await Account.findById(acc._id);
    const instAfter = await Installment.findById(inst._id);
    assert.equal(accAfter.balance, accBalanceBefore, 'Un borrador financiero offline nunca debe alterar saldos de cuentas automáticamente');
    assert.equal(instAfter.status, 'pendiente', 'Un borrador financiero offline nunca debe dar por pagada una cuota sin confirmación en el servidor');

    // Si ahora la cuota se paga en el servidor y luego entra otro borrador offline sobre esa cuota -> debe reportar conflicto INSTALLMENT_ALREADY_CLOSED
    instAfter.status = 'pagada';
    await instAfter.save();

    const lateDraftRes = await apiCall('POST', '/api/admin/offline/sync', {
        operations: [{
            idempotencyKey: 'idem_fin_conflict_002',
            operationType: 'financial_draft',
            entityId: String(inst._id),
            payload: { installmentId: String(inst._id), amount: 2000000 }
        }]
    });
    assert.equal(lateDraftRes.status, 200);
    assert.equal(lateDraftRes.json.results[0].status, 'conflict');
    assert.equal(lateDraftRes.json.results[0].conflictDetails.reason, 'INSTALLMENT_ALREADY_CLOSED');
});

await test('Aislamiento por usuario, limpieza al cerrar sesión y protección de PIN de Tesorería', async () => {
    const sharedDeviceStorage = createMemoryStorage();

    enqueueOfflineOperation('user_ventas_A', {
        idempotencyKey: 'op_user_A',
        operationType: 'client_draft',
        payload: { fullName: 'Cliente de Vendedor A' }
    }, sharedDeviceStorage);

    enqueueOfflineOperation('user_ventas_B', {
        idempotencyKey: 'op_user_B',
        operationType: 'client_draft',
        payload: { fullName: 'Cliente de Vendedor B' }
    }, sharedDeviceStorage);

    const snapA = getOfflineSnapshot('user_ventas_A', sharedDeviceStorage);
    const snapB = getOfflineSnapshot('user_ventas_B', sharedDeviceStorage);

    assert.equal(snapA.outbox.length, 1);
    assert.equal(snapA.outbox[0].idempotencyKey, 'op_user_A');
    assert.equal(snapB.outbox.length, 1);
    assert.equal(snapB.outbox[0].idempotencyKey, 'op_user_B');

    // Limpiar datos de user_ventas_A al cerrar sesión no borra la cola aislada de user_ventas_B
    clearOfflineData('user_ventas_A', sharedDeviceStorage);
    assert.equal(getOfflineSnapshot('user_ventas_A', sharedDeviceStorage), null);
    assert.notEqual(getOfflineSnapshot('user_ventas_B', sharedDeviceStorage), null);

    // Verificar que el modo offline NO saltea la protección por PIN de Tesorería Estratégica
    const treasuryResWithoutPin = await apiCall('GET', '/api/admin/tesoreria-estrategica/data');
    assert.ok(
        treasuryResWithoutPin.status === 401 || treasuryResWithoutPin.status === 403,
        'Las rutas de Tesorería Estratégica deben seguir exigiendo sesión de PIN válida'
    );
});

await finish();
