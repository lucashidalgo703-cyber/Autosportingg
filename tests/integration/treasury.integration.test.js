// Pruebas de integración Etapas 5, 6, 7 y 8: Tesorería Estratégica, Regularización Histórica, PIN y Simulador.
// Usa MongoDB en memoria (mongodb-memory-server): nunca toca producción.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { boot } from './harness.js';

const { call, test, finish, mongoose, token, ownerId } = await boot();
const { default: Account } = await import('../../src/models/Account.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Car } = await import('../../src/models/Car.js');
const { default: Installment } = await import('../../src/models/Installment.js');
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { default: AdminUser } = await import('../../src/models/AdminUser.js');

function hashValue(val) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(val, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

// Crear/actualizar usuario propietario en la DB en memoria para probar recuperación de PIN con contraseña
const ownerPassword = 'OwnerSecretPassword2026!';
await AdminUser.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(ownerId) },
    {
        $set: {
            name: 'Propietario Test',
            email: 'owner@autosporting.test',
            passwordHash: hashValue(ownerPassword),
            role: 'owner',
            status: 'activo',
            active: true
        }
    },
    { upsert: true, new: true }
);

let treasuryToken = null;
const tCall = (method, path, body) => call(method, path, body, token, treasuryToken ? { 'x-treasury-token': treasuryToken } : {});

console.log('Etapas 5, 6, 7 y 8 — Tesorería Estratégica, Regularización Histórica, PIN y Simulador');

await test('Etapa 7: estado inicial sin PIN, bloqueo de rutas sin token, configuración de PIN, bloqueo tras 5 intentos fallidos y recuperación con contraseña', async () => {
    // 1. Estado inicial: pinConfigured = false
    const st1 = await call('GET', '/api/admin/tesoreria-estrategica/status');
    assert.equal(st1.status, 200);
    assert.equal(st1.json.ok, true);
    assert.equal(st1.json.status.pinConfigured, false);
    assert.equal(st1.json.status.isLocked, false);

    // 2. Acceso sin x-treasury-token debe devolver 403 requirePin: true
    const blocked = await call('GET', '/api/admin/tesoreria-estrategica/data');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.requirePin, true);

    // 3. Configurar PIN inicial (primer acceso)
    const setup = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', {
        pin: '4826',
        confirmPin: '4826'
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.json));
    assert.equal(setup.json.ok, true);
    assert.ok(setup.json.treasuryToken);

    // 4. Ahora pinConfigured debe ser true y no se puede volver a invocar setupInitialPin
    const st2 = await call('GET', '/api/admin/tesoreria-estrategica/status');
    assert.equal(st2.json.status.pinConfigured, true);
    const reSetup = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', {
        pin: '1111',
        confirmPin: '1111'
    });
    assert.equal(reSetup.status, 400);

    // 5. Provocar 5 intentos fallidos -> debe bloquear por 15 minutos (status 423, isLocked: true)
    for (let i = 1; i <= 5; i++) {
        const bad = await call('POST', '/api/admin/tesoreria-estrategica/pin/verify', { pin: '0000' });
        if (i < 5) {
            assert.equal(bad.status, 401);
            assert.equal(bad.json.remainingAttempts, 5 - i);
        } else {
            assert.equal(bad.status, 423);
            assert.equal(bad.json.isLocked, true);
        }
    }

    // Aun ingresando el PIN correcto mientras está bloqueado debe rechazar con 423
    const whileLocked = await call('POST', '/api/admin/tesoreria-estrategica/pin/verify', { pin: '4826' });
    assert.equal(whileLocked.status, 423);
    assert.equal(whileLocked.json.isLocked, true);

    // 6. Recuperar PIN reautenticando al propietario con su contraseña del CRM
    const recover = await call('POST', '/api/admin/tesoreria-estrategica/pin/recover', {
        password: ownerPassword,
        newPin: '7391',
        confirmNewPin: '7391'
    });
    assert.equal(recover.status, 200, JSON.stringify(recover.json));
    assert.equal(recover.json.ok, true);
    treasuryToken = recover.json.treasuryToken;
    assert.ok(treasuryToken);
});

await test('Etapa 5 y 7: configurar parámetros, confirmar corte inicial, organizar saldo inicial entre las 8 cajas sin crear ingresos y verificar ecuación de conciliación ARS y USD', async () => {
    // Crear cuentas reales en ARS y USD
    const accARS = await Account.create({
        name: 'Banco Principal ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 20000000
    });
    const accUSD = await Account.create({
        name: 'Caja Seguridad USD',
        type: 'Efectivo',
        currency: 'USD',
        balance: 12000
    });

    // Registrar un movimiento previo a la fecha de corte (ya incluido en el saldo de la cuenta)
    await Transaction.create({
        date: new Date('2026-03-10T10:00:00.000Z'),
        type: 'Ingreso',
        amount: 2000000,
        currency: 'ARS',
        category: 'Venta de Vehículo',
        concept: 'Venta histórica previa al corte',
        description: 'Venta histórica previa al corte',
        accountId: accARS._id,
        module: 'crm_v2',
        status: 'activo'
    });

    // 1. Guardar configuración de parámetros (Asistente Paso 2 y 3)
    const cfgRes = await tCall('POST', '/api/admin/tesoreria-estrategica/config', {
        operationalHorizonDays: 30,
        reserveMonths: 3,
        personalMonthlyBudgetARS: 1500000,
        postventaProvisionPerVehicleARS: 300000,
        autoDistributeIncomes: false,
        surplusRule: {
            configured: false,
            stockPercent: 70,
            crecimientoPercent: 30
        },
        priorityOrder: ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento']
    });
    assert.equal(cfgRes.status, 200, JSON.stringify(cfgRes.json));

    // 2. Confirmar corte inicial sobre el saldo actual (Asistente Paso 1)
    const cutoffRes = await tCall('POST', '/api/admin/tesoreria-estrategica/confirm-initial-cutoff', {
        cutoffDate: '2026-04-01T00:00:00.000Z',
        reason: 'Corte inicial verificado'
    });
    assert.equal(cutoffRes.status, 200, JSON.stringify(cutoffRes.json));
    assert.equal(cutoffRes.json.ok, true);

    // 3. Organizar parte del saldo inicial en las cajas sin generar nuevos movimientos en cuentas
    const txBefore = await Transaction.countDocuments();
    const orgRes = await tCall('POST', '/api/admin/tesoreria-estrategica/organize-initial-balance', {
        allocations: [
            { boxKey: 'operativa', assignARS: 3000000, assignUSD: 0 },
            { boxKey: 'reserva', assignARS: 4000000, assignUSD: 2000 },
            { boxKey: 'stock', assignARS: 8000000, assignUSD: 5000 }
        ],
        reason: 'Organización inicial de cajas'
    });
    assert.equal(orgRes.status, 200, JSON.stringify(orgRes.json));
    const txAfter = await Transaction.countDocuments();
    assert.equal(txAfter, txBefore, 'Asignar dinero a cajas no debe crear transacciones bancarias ni nuevos ingresos');

    // 4. Consultar panel principal y comprobar ecuación de conciliación por moneda
    const dash = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    assert.equal(dash.status, 200);
    const { summary, pendingIncomes, boxes } = dash.json.data;

    assert.equal(boxes.length, 8, 'Deben existir exactamente las 8 cajas estratégicas');
    assert.equal(pendingIncomes.length, 0, 'Los cobros anteriores al corte inicial no deben enviarse a la bandeja de pendientes');

    // Ecuación ARS: 20.000.000 = 15.000.000 asignados + 5.000.000 sin asignar + 0 terceros
    assert.equal(summary.totalCuentasARS, 20000000);
    assert.equal(summary.totalAsignadoCajasARS, 15000000);
    assert.equal(summary.sinAsignarARS, 5000000);
    assert.equal(summary.fondosRetenidosTercerosARS, 0);
    assert.equal(summary.reconciliationEquation.ARS.isBalanced, true);

    // Ecuación USD: 12.000 = 7.000 asignados + 5.000 sin asignar + 0 terceros
    assert.equal(summary.totalCuentasUSD, 12000);
    assert.equal(summary.totalAsignadoCajasUSD, 7000);
    assert.equal(summary.sinAsignarUSD, 5000);
    assert.equal(summary.reconciliationEquation.USD.isBalanced, true);
});

await test('Etapa 5: cobro único desde cuota ingresa una sola vez a la cuenta, aparece en bandeja de pendientes, aplica distribución sugerida y bloquea doble distribución', async () => {
    const accARS = await Account.findOne({ currency: 'ARS' });

    // Configurar meta mensual de Operativa en 4.200.000 ARS (saldo actual 3.000.000 -> faltante 1.200.000)
    await TreasuryBox.findOneAndUpdate({ key: 'operativa' }, { $set: { monthlyTargetARS: 4200000 } });

    const car = await Car.create({
        brand: 'Toyota',
        name: 'Corolla XEI',
        year: 2021,
        km: 45000,
        fuel: 'Nafta',
        condition: 'Usado',
        currency: 'ARS',
        purchaseCurrency: 'ARS',
        price: 22000000,
        purchasePrice: 17000000,
        status: 'Vendido'
    });
    const sale = await Sale.create({
        vehicleId: car._id,
        salePrice: 22000000,
        saleCurrency: 'ARS',
        paymentMethod: 'financiado',
        saleDate: new Date('2026-04-05T12:00:00.000Z'),
        actualDeliveryDate: new Date('2026-04-05T15:00:00.000Z'),
        deliveryStatus: 'entregado',
        status: 'entregada'
    });
    const inst = await Installment.create({
        saleId: sale._id,
        vehicleId: car._id,
        installmentNumber: 1,
        dueDate: new Date('2026-05-05T00:00:00.000Z'),
        amount: 3500000,
        currency: 'ARS',
        status: 'pendiente'
    });

    // Cobrar la cuota desde el endpoint de cuotas
    const payRes = await tCall('POST', `/api/admin/installments/${inst._id}/pay`, {
        amount: 3500000,
        paymentMethod: 'transferencia',
        accountId: accARS._id.toString(),
        notes: 'Cobro cuota 1 Corolla'
    });
    assert.equal(payRes.status, 200, JSON.stringify(payRes.json));
    assert.ok(payRes.json.treasuryIntegration);
    assert.equal(payRes.json.treasuryIntegration.status, 'pending_distribution');

    // Comprobar que existe UN SOLO ingreso en Transaction para esta cuota
    const instTxs = await Transaction.find({ installmentId: inst._id, status: { $ne: 'anulado' } });
    assert.equal(instTxs.length, 1);
    const incomeTx = instTxs[0];

    // Debe aparecer inmediatamente en la bandeja de cobros pendientes de distribuir
    const dash1 = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    const pendingItem = dash1.json.data.pendingIncomes.find(p => String(p._id) === String(incomeTx._id));
    assert.ok(pendingItem, 'El cobro de cuota confirmado debe aparecer en pendingIncomes');
    assert.equal(pendingItem.propioAmount, 3500000);
    assert.ok(Array.isArray(pendingItem.suggestedAllocations));
    assert.ok(pendingItem.suggestedAllocations.length > 0);

    // Aplicar distribución sugerida usando ese mismo cobro
    const distRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/distribute', {
        transactionId: incomeTx._id.toString(),
        useSuggested: true
    });
    assert.equal(distRes.status, 200, JSON.stringify(distRes.json));
    assert.equal(distRes.json.ok, true);

    // Verificar que distribuir no creó una segunda transacción en la cuenta
    const instTxsAfter = await Transaction.find({ installmentId: inst._id, status: { $ne: 'anulado' } });
    assert.equal(instTxsAfter.length, 1);

    // Intentar distribuir por segunda vez el mismo cobro debe fallar con 400
    const doubleDist = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/distribute', {
        transactionId: incomeTx._id.toString(),
        useSuggested: true
    });
    assert.equal(doubleDist.status, 400);
});

await test('Etapa 5: separación de fondos de terceros/socios en cobros, límite de distribución sobre porción propia y recuperación segura de cobros posteriores al corte', async () => {
    const accARS = await Account.findOne({ currency: 'ARS' });

    // Crear vehículo con 50% de participación de socio inversor
    const sharedCar = await Car.create({
        brand: 'Volkswagen',
        name: 'Amarok V6',
        year: 2022,
        km: 30000,
        fuel: 'Diesel',
        condition: 'Usado',
        currency: 'ARS',
        purchaseCurrency: 'ARS',
        price: 36000000,
        purchasePrice: 30000000,
        status: 'Vendido',
        investor: {
            name: 'Socio Inversor',
            percentage: 50
        }
    });

    // Registrar cobro de entrega por $10.000.000 ARS vinculado al vehículo compartido
    const txRes = await tCall('POST', '/api/admin/transactions', {
        type: 'ingreso',
        category: 'Entregas',
        concept: 'Entrega Amarok V6 compartida 50%',
        amount: 10000000,
        currency: 'ARS',
        paymentMethod: 'transferencia',
        accountId: accARS._id.toString(),
        vehicleId: sharedCar._id.toString(),
        date: '2026-04-12T15:00:00.000Z'
    });
    assert.equal(txRes.status, 201, JSON.stringify(txRes.json));

    const dash = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    const pendingShared = dash.json.data.pendingIncomes.find(p => String(p._id) === String(txRes.json._id));
    assert.ok(pendingShared);
    assert.equal(pendingShared.propioAmount, 5000000, 'Solo el 50% ($5M) corresponde a fondos propios de la agencia');
    assert.equal(pendingShared.tercerosAmount, 5000000, 'El otro 50% ($5M) corresponde al socio');
    assert.equal(dash.json.data.summary.fondosRetenidosTercerosARS, 5000000);
    assert.equal(dash.json.data.summary.reconciliationEquation.ARS.isBalanced, true);

    // Intentar distribuir más de la porción propia ($8M > $5M) a las cajas propias debe rechazarse
    const overDist = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/distribute', {
        transactionId: txRes.json._id.toString(),
        allocations: [{ boxKey: 'stock', amount: 8000000 }]
    });
    assert.equal(overDist.status, 400);

    // Distribuir exactamente la porción propia ($5M) debe funcionar
    const validDist = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/distribute', {
        transactionId: txRes.json._id.toString(),
        allocations: [{ boxKey: 'stock', amount: 5000000 }]
    });
    assert.equal(validDist.status, 200, JSON.stringify(validDist.json));

    // Probar recuperación segura de un cobro posterior al corte que fue insertado sin treasuryControl
    const rawTx = await Transaction.create({
        date: new Date('2026-04-14T11:00:00.000Z'),
        type: 'Ingreso',
        amount: 1200000,
        currency: 'ARS',
        category: 'Ventas',
        concept: 'Cobro posterior al corte sin metadata de tesorería',
        description: 'Cobro posterior al corte sin metadata de tesorería',
        accountId: accARS._id,
        module: 'crm_v2',
        status: 'activo',
        treasuryControl: {
            isBeforeCutoff: true, // Marcado erróneamente antes pero con fecha posterior al corte
            inboxStatus: 'excluido_corte'
        }
    });

    const prevRec = await tCall('GET', '/api/admin/tesoreria-estrategica/recover-pending-incomes/preview');
    assert.equal(prevRec.status, 200);
    assert.ok(prevRec.json.recoverableToInbox.some(r => String(r._id) === String(rawTx._id)));

    const execRec = await tCall('POST', '/api/admin/tesoreria-estrategica/recover-pending-incomes', {
        transactionIds: [rawTx._id.toString()]
    });
    assert.equal(execRec.status, 200);
    assert.equal(execRec.json.recoveredCount, 1);
});

await test('Etapa 5: reglas de categorías de gastos (Sueldos/Comisiones -> Operativa, Retiros Personales -> Personal) y reserva de compromisos pendientes vs descuento al pagar', async () => {
    const accARS = await Account.findOne({ currency: 'ARS' });

    // Asignar fondos a la caja Personal para poder debitar retiros del propietario
    await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/distribute', {
        allocations: [{ boxKey: 'personal', assignARS: 1500000, assignUSD: 0 }],
        reason: 'Fondeo caja personal'
    });

    const opBefore = await TreasuryBox.findOne({ key: 'operativa' });
    const persBefore = await TreasuryBox.findOne({ key: 'personal' });

    // 1. Registrar Sueldo pagado ('activo') -> debe descontar de Operativa una sola vez
    const salaryRes = await tCall('POST', '/api/admin/transactions', {
        type: 'egreso',
        category: 'Sueldos y Comisiones',
        concept: 'Pago sueldo vendedor',
        amount: 400000,
        currency: 'ARS',
        paymentMethod: 'transferencia',
        accountId: accARS._id.toString(),
        status: 'activo'
    });
    assert.equal(salaryRes.status, 201);

    // 2. Registrar Retiro Personal pagado ('activo') -> debe descontar de Personal
    const ownerWithdrawalRes = await tCall('POST', '/api/admin/transactions', {
        type: 'egreso',
        category: 'Retiros Personales',
        concept: 'Retiro mensual titular',
        amount: 300000,
        currency: 'ARS',
        paymentMethod: 'transferencia',
        accountId: accARS._id.toString(),
        status: 'activo'
    });
    assert.equal(ownerWithdrawalRes.status, 201);

    // 3. Registrar Impuesto PENDIENTE ('pendiente') -> debe reservar en pendingCommitmentsARS de Impuestos sin descontar balanceARS
    const taxPendingRes = await tCall('POST', '/api/admin/transactions', {
        type: 'egreso',
        category: 'Impuestos',
        concept: 'IIBB devengado pendiente de pago',
        amount: 250000,
        currency: 'ARS',
        paymentMethod: 'transferencia',
        accountId: accARS._id.toString(),
        status: 'pendiente'
    });
    assert.equal(taxPendingRes.status, 201);

    const opAfter = await TreasuryBox.findOne({ key: 'operativa' });
    const persAfter = await TreasuryBox.findOne({ key: 'personal' });
    const taxBoxPending = await TreasuryBox.findOne({ key: 'impuestos' });

    assert.equal(opAfter.balanceARS, opBefore.balanceARS - 400000, 'Sueldos y comisiones deben descontarse de Operativa');
    assert.equal(persAfter.balanceARS, persBefore.balanceARS - 300000, 'Retiros del propietario deben descontarse de Personal');
    assert.equal(taxBoxPending.pendingCommitmentsARS, 250000, 'Un compromiso pendiente debe reservarse en pendingCommitmentsARS');
    assert.equal(taxBoxPending.balanceARS, 0, 'Un compromiso pendiente no debe descontar el saldo real de la caja hasta pagarse');

    // 4. Confirmar el pago del compromiso pendiente -> libera la reserva y descuenta una sola vez
    await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/distribute', {
        allocations: [{ boxKey: 'impuestos', assignARS: 500000, assignUSD: 0 }],
        reason: 'Fondeo caja impuestos'
    });
    const payTaxRes = await tCall('PATCH', `/api/admin/transactions/${taxPendingRes.json._id}`, {
        status: 'activo'
    });
    assert.equal(payTaxRes.status, 200);

    const taxBoxPaid = await TreasuryBox.findOne({ key: 'impuestos' });
    assert.equal(taxBoxPaid.pendingCommitmentsARS, 0, 'Al pagar el compromiso debe liberarse la reserva pendiente');
    assert.equal(taxBoxPaid.balanceARS, 250000, 'Al pagar el compromiso debe descontarse exactamente una vez de la caja');
});

await test('Etapa 6: regularización histórica de cuotas por venta ("Pagadas hasta la cuota N") y selección puntual sin tocar cuentas ni cajas ni fabricar paymentDate, y reversión de lote', async () => {
    const histCar = await Car.create({
        brand: 'Ford',
        name: 'Focus SE',
        year: 2019,
        km: 60000,
        fuel: 'Nafta',
        condition: 'Usado',
        currency: 'ARS',
        price: 15000000,
        purchasePrice: 12000000,
        status: 'Vendido'
    });
    const histSale = await Sale.create({
        vehicleId: histCar._id,
        salePrice: 15000000,
        saleCurrency: 'ARS',
        paymentMethod: 'financiado',
        saleDate: new Date('2025-10-01T10:00:00.000Z'),
        status: 'confirmada'
    });

    const createdInsts = [];
    for (let i = 1; i <= 6; i++) {
        const inst = await Installment.create({
            saleId: histSale._id,
            vehicleId: histCar._id,
            installmentNumber: i,
            dueDate: new Date(`2025-1${Math.min(2, i)}-10T00:00:00.000Z`),
            amount: 1000000,
            currency: 'ARS',
            status: 'pendiente'
        });
        createdInsts.push(inst);
    }

    const dashBefore = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    const cuentasBefore = dashBefore.json.data.summary.totalCuentasARS;
    const cajasBefore = dashBefore.json.data.summary.totalAsignadoCajasARS;
    const inboxCountBefore = dashBefore.json.data.pendingIncomes.length;

    // 1. Vista previa de regularización ("Pagadas hasta la cuota 3" + cuota salteada 5)
    const inst5Id = createdInsts[4]._id.toString();
    const previewRes = await tCall('POST', '/api/admin/tesoreria-estrategica/installments/batch-regularize/preview', {
        bySaleRules: [{ saleId: histSale._id.toString(), upToInstallmentNumber: 3 }],
        installmentIds: [inst5Id],
        cutoffDate: '2026-04-01'
    });
    assert.equal(previewRes.status, 200, JSON.stringify(previewRes.json));
    assert.equal(previewRes.json.installmentsCount, 4);
    assert.equal(previewRes.json.totalARS, 4000000);
    assert.equal(previewRes.json.accountBalanceImpactARS, 0);
    assert.equal(previewRes.json.boxBalanceImpactARS, 0);

    // 2. Ejecutar regularización en lote sin fecha conocida de cobro
    const regRes = await tCall('POST', '/api/admin/tesoreria-estrategica/installments/batch-regularize', {
        bySaleRules: [{ saleId: histSale._id.toString(), upToInstallmentNumber: 3 }],
        installmentIds: [inst5Id],
        cutoffDate: '2026-04-01',
        reason: 'Cuotas 1 a 3 y cuota 5 cobradas antes del corte inicial'
    });
    assert.equal(regRes.status, 200, JSON.stringify(regRes.json));
    assert.equal(regRes.json.regularizedCount, 4);
    const batchId = regRes.json.batchId;
    assert.ok(batchId);

    // 3. Verificar estado en base de datos: cuotas 1, 2, 3 y 5 pagadas e históricamente regularizadas con paymentDate = null
    const instsAfter = await Installment.find({ saleId: histSale._id }).sort({ installmentNumber: 1 });
    for (const inst of instsAfter) {
        if ([1, 2, 3, 5].includes(inst.installmentNumber)) {
            assert.equal(inst.status, 'pagada');
            assert.equal(inst.isHistoricallyRegularized, true);
            assert.equal(inst.paymentDate, null, 'No debe inventar paymentDate usando dueDate cuando se desconoce la fecha real de cobro');
            assert.equal(inst.regularizationBatchId, batchId);
        } else {
            assert.equal(inst.status, 'pendiente');
        }
    }

    // 4. Verificar que NO alteró cuentas, cajas ni bandeja de pendientes
    const dashAfter = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    assert.equal(dashAfter.json.data.summary.totalCuentasARS, cuentasBefore);
    assert.equal(dashAfter.json.data.summary.totalAsignadoCajasARS, cajasBefore);
    assert.equal(dashAfter.json.data.pendingIncomes.length, inboxCountBefore);

    // 5. Revertir el lote completo
    const revRes = await tCall('POST', '/api/admin/tesoreria-estrategica/installments/batch-revert', {
        batchId,
        reason: 'Prueba de reversión de lote'
    });
    assert.equal(revRes.status, 200, JSON.stringify(revRes.json));
    assert.equal(revRes.json.revertedCount, 4);

    const instsReverted = await Installment.find({ saleId: histSale._id });
    assert.ok(instsReverted.every(i => i.status === 'pendiente' && !i.isHistoricallyRegularized));
});

await test('Etapa 8: simulador de capacidad de compra (100% propio vs compartido con socio, quién paga gastos, cajas protegidas afectadas y días de cobertura) sin mutar DB', async () => {
    const dashBefore = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    const availableARS = dashBefore.json.data.planning.availableToBuyARS;
    const txCountBefore = await Transaction.countDocuments();

    // 1. Simular compra compartida 50% con socio y gastos compartidos dentro de la capacidad disponible
    const sim1 = await tCall('POST', '/api/admin/tesoreria-estrategica/simulate-purchase', {
        vehicleName: 'Peugeot 208 Feline',
        totalPrice: 10000000,
        currency: 'ARS',
        exchangeRate: 1200,
        agencySharePct: 50,
        additionalExpenses: 600000,
        expensesPaidBy: 'shared'
    });
    assert.equal(sim1.status, 200, JSON.stringify(sim1.json));
    assert.equal(sim1.json.ok, true);
    assert.equal(sim1.json.agencyPriceShare, 5000000);
    assert.equal(sim1.json.partnerPriceShare, 5000000);
    assert.equal(sim1.json.agencyExpensesShare, 300000);
    assert.equal(sim1.json.agencyTotalRequired, 5300000);
    assert.equal(sim1.json.viableWithoutProtectedFunds, true);
    assert.equal(sim1.json.affectsProtectedFunds, false);
    assert.equal(sim1.json.availableAfterPurchase, availableARS - 5300000);

    // 2. Simular compra 100% propia que supera el disponible y compromete fondos protegidos
    const hugePrice = availableARS + 3000000;
    const sim2 = await tCall('POST', '/api/admin/tesoreria-estrategica/simulate-purchase', {
        vehicleName: 'Camioneta Alta Gama',
        totalPrice: hugePrice,
        currency: 'ARS',
        agencySharePct: 100,
        additionalExpenses: 500000,
        expensesPaidBy: 'agency'
    });
    assert.equal(sim2.status, 200);
    assert.equal(sim2.json.viableWithoutProtectedFunds, false);
    assert.equal(sim2.json.affectsProtectedFunds, true);
    assert.equal(sim2.json.shortfall, 3500000);
    assert.equal(sim2.json.availableAfterPurchase, 0);
    assert.ok(sim2.json.affectedProtectedBoxes.length > 0);

    // 3. Comprobar que el simulador no alteró saldos ni creó movimientos
    const dashAfter = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    const txCountAfter = await Transaction.countDocuments();
    assert.equal(dashAfter.json.data.summary.totalCuentasARS, dashBefore.json.data.summary.totalCuentasARS);
    assert.equal(dashAfter.json.data.summary.totalAsignadoCajasARS, dashBefore.json.data.summary.totalAsignadoCajasARS);
    assert.equal(txCountAfter, txCountBefore);
});

await finish();
