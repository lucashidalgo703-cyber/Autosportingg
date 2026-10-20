// Pruebas de integración para "Registrar cobro y distribuir" en Tesorería Estratégica.
// Valida los 8 escenarios solicitados en la Sección 11 en un entorno 100% aislado en memoria.
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, mongoose, token, ownerId } = await boot();
const { default: Account } = await import('../../src/models/Account.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Car } = await import('../../src/models/Car.js');
const { default: Installment } = await import('../../src/models/Installment.js');
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { default: TreasuryConfig } = await import('../../src/models/TreasuryConfig.js');

let treasuryPinToken = null;
const tCall = (method, path, body) => call(
    method,
    path,
    body,
    token,
    treasuryPinToken ? { 'x-treasury-token': treasuryPinToken } : {}
);

const makeCar = async (overrides = {}) => {
    return await Car.create({
        brand: 'Toyota',
        name: 'Corolla XEI',
        year: 2022,
        price: 15000000,
        currency: 'ARS',
        purchasePrice: 10000000,
        purchaseCurrency: 'ARS',
        condition: 'Usado',
        fuel: 'Nafta',
        km: 35000,
        status: 'Disponible',
        expenses: [],
        ...overrides
    });
};

console.log('=== PRUEBAS DE INTEGRACIÓN: REGISTRAR COBRO Y DISTRIBUIR ===');

// Setup: Configurar PIN de Tesorería Estratégica y obtener token protegido
await test('0. Autenticación y configuración inicial de PIN en Tesorería Estratégica', async () => {
    // 0.1 Configurar PIN inicial
    const pinRes = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', {
        pin: '1234',
        confirmPin: '1234'
    }, token);
    assert.equal(pinRes.status, 200);
    assert.equal(pinRes.json.ok, true);
    treasuryPinToken = pinRes.json.treasuryToken;
    assert.ok(treasuryPinToken, 'Debe devolver token de sesión de Tesorería');

    // 0.2 Configurar esquema de reparto por defecto: estabilizacion
    const cfgRes = await tCall('POST', '/api/admin/tesoreria-estrategica/config', {
        activeDistributionScheme: 'estabilizacion'
    });
    assert.equal(cfgRes.status, 200);
    assert.equal(cfgRes.json.config.activeDistributionScheme, 'estabilizacion');
});

// Escenario 8: Rechazo de operaciones sin autorización válida (sin JWT o sin PIN)
await test('Escenario 8: Rechazo estricto de operaciones sin autorización válida', async () => {
    // 8.1 Sin JWT -> 401 o 403
    const noJwt = await call('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        amount: 1000000,
        currency: 'ARS'
    }, null);
    assert.ok([401, 403].includes(noJwt.status), `Status esperado 401/403, recibido: ${noJwt.status}`);

    // 8.2 Con JWT pero sin token de PIN de Tesorería -> 403 requirePin: true
    const noPin = await call('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        amount: 1000000,
        currency: 'ARS'
    }, token);
    assert.equal(noPin.status, 403);
    assert.equal(noPin.json.requirePin, true);

    // 8.3 Con token de PIN inválido -> 403 requirePin: true
    const badPin = await call('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        amount: 1000000,
        currency: 'ARS'
    }, token, { 'x-treasury-token': 'token_invalido_123' });
    assert.equal(badPin.status, 403);
    assert.equal(badPin.json.requirePin, true);
});

// Escenario 1: Cobro parcial y cobro completo con esquema acordado
await test('Escenario 1: Cobro parcial y cobro completo con esquema acordado', async () => {
    // Crear cuentas
    const accGalicia = await Account.create({
        name: 'Banco Galicia ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    // Crear vehículo con costo $10.000.000 ARS
    const car1 = await makeCar({
        brand: 'Toyota',
        name: 'Corolla XEI',
        purchasePrice: 10000000,
        purchaseCurrency: 'ARS'
    });

    // Crear venta por $14.000.000 ARS (Ganancia neta: $4.000.000)
    const sale1 = await Sale.create({
        vehicleId: car1._id,
        salePrice: 14000000,
        saleCurrency: 'ARS',
        customerName: 'Juan Pérez',
        status: 'confirmada'
    });

    // 1.0 Probar previsualización antes de confirmar
    const prevRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/preview-distribution', {
        saleId: sale1._id,
        amount: 6000000,
        currency: 'ARS',
        schemeKey: 'estabilizacion'
    });
    assert.equal(prevRes.status, 200);
    assert.equal(prevRes.json.proposal.capitalRecoveredToStock, 6000000);
    assert.equal(prevRes.json.proposal.distributableMargin, 0);

    // 1.1 Cobro parcial 1: Entrega inicial de $6.000.000 ARS
    // Debe ir 100% a recuperación de capital (Stock), sin margen disponible aún
    const res1 = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: sale1._id,
        amount: 6000000,
        currency: 'ARS',
        accountId: accGalicia._id,
        conceptType: 'entrega_inicial',
        schemeKey: 'estabilizacion'
    });
    assert.equal(res1.status, 200, res1.text);
    assert.equal(res1.json.ok, true);
    assert.equal(res1.json.summary.totalCollected, 6000000);
    assert.equal(res1.json.summary.capitalRecovered, 6000000);
    assert.equal(res1.json.summary.distributableMargin, 0);

    // Verificar saldo en cuenta
    const accPost1 = await Account.findById(accGalicia._id);
    assert.equal(accPost1.balance, 6000000);

    // Verificar saldo en Caja Stock
    const boxStock1 = await TreasuryBox.findOne({ key: 'stock' });
    assert.equal(boxStock1.balanceARS, 6000000);

    // 1.2 Cobro parcial 2: Segundo cobro de $6.000.000 ARS
    // Completa los $4.000.000 restantes de capital hacia Stock + libera $2.000.000 de margen
    // Esquema Estabilización: Operativa 60% ($1.200.000), Reserva 20% ($400.000), Postventa 10% ($200.000), Crecimiento 10% ($200.000), Personal 0%
    const res2 = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: sale1._id,
        amount: 6000000,
        currency: 'ARS',
        accountId: accGalicia._id,
        conceptType: 'saldo',
        schemeKey: 'estabilizacion'
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.json.summary.capitalRecovered, 4000000);
    assert.equal(res2.json.summary.distributableMargin, 2000000);
    assert.equal(res2.json.summary.marginDistributed, 2000000);

    // Verificar asignaciones por destino en el resultado
    const destMap2 = new Map(res2.json.summary.destinations.map(d => [d.destinationKey, d.amount]));
    assert.equal(destMap2.get('operativa'), 1200000);
    assert.equal(destMap2.get('reserva'), 400000);
    assert.equal(destMap2.get('postventa'), 200000);
    assert.equal(destMap2.get('crecimiento'), 200000);
    assert.equal(destMap2.get('personal'), 0);

    // 1.3 Cobro final: Saldo restante de $2.000.000 ARS
    // Capital ya está 100% recuperado -> 100% margen disponible con esquema Caja Sólida
    // Caja Sólida: Operativa 50% ($1.000.000), Reserva 15% ($300.000), Postventa 10% ($200.000), Crecimiento 20% ($400.000), Personal 5% ($100.000)
    const res3 = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: sale1._id,
        amount: 2000000,
        currency: 'ARS',
        accountId: accGalicia._id,
        conceptType: 'saldo',
        schemeKey: 'caja_solida'
    });
    assert.equal(res3.status, 200);
    assert.equal(res3.json.summary.capitalRecovered, 0);
    assert.equal(res3.json.summary.distributableMargin, 2000000);
    assert.equal(res3.json.summary.marginDistributed, 2000000);

    const destMap3 = new Map(res3.json.summary.destinations.map(d => [d.destinationKey, d.amount]));
    assert.equal(destMap3.get('operativa'), 1000000);
    assert.equal(destMap3.get('reserva'), 300000);
    assert.equal(destMap3.get('postventa'), 200000);
    assert.equal(destMap3.get('crecimiento'), 400000);
    assert.equal(destMap3.get('personal'), 100000);

    // Saldo acumulado en cuenta = $14.000.000
    const accPostFinal = await Account.findById(accGalicia._id);
    assert.equal(accPostFinal.balance, 14000000);

    // Saldo pendiente en la venta debe ser $0
    assert.equal(res3.json.saleState.pendingSaleBalance, 0);
    assert.equal(res3.json.saleState.effectivelyCollectedCash, 14000000);
});

// Escenario 2: Cobro de cuota (conservando opción de 3 cuotas y desglose de capital e interés)
await test('Escenario 2: Cobro de cuota con plan de 3 cuotas y desglose capital/interés', async () => {
    const accBanco = await Account.create({
        name: 'Banco Santander ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    const carFin = await makeCar({
        brand: 'Ford',
        name: 'Focus SE',
        year: 2019,
        purchasePrice: 9000000,
        purchaseCurrency: 'ARS'
    });

    // Venta financiada en 3 cuotas: Contado $12M, Entrega $6M, Saldo financiado $6M, Interés $600.000 (10%), Total financiado $6.600.000 (3 cuotas de $2.200.000)
    // Precio total operación = $12.600.000
    const saleFin = await Sale.create({
        vehicleId: carFin._id,
        salePrice: 12600000,
        saleCurrency: 'ARS',
        customerName: 'Carlos Gómez',
        status: 'confirmada',
        financingDetails: {
            hasFinancing: true,
            cashPrice: 12000000,
            downPayment: 6000000,
            financedBalance: 6000000,
            installmentsCount: 3,
            interestRate: 10,
            interestAmount: 600000,
            totalFinancedWithInterest: 6600000,
            installmentAmount: 2200000,
            lastInstallmentAmount: 2200000,
            totalOperationPrice: 12600000
        }
    });

    // Crear las 3 cuotas operativas
    const inst1 = await Installment.create({
        saleId: saleFin._id,
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        amount: 2200000,
        currency: 'ARS',
        status: 'pendiente'
    });
    const inst2 = await Installment.create({
        saleId: saleFin._id,
        installmentNumber: 2,
        dueDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
        amount: 2200000,
        currency: 'ARS',
        status: 'pendiente'
    });
    const inst3 = await Installment.create({
        saleId: saleFin._id,
        installmentNumber: 3,
        dueDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
        amount: 2200000,
        currency: 'ARS',
        status: 'pendiente'
    });

    // 2.1 Pago parcial de Cuota 1: $1.000.000 de los $2.200.000
    const payPartRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        installmentId: inst1._id,
        amount: 1000000,
        currency: 'ARS',
        accountId: accBanco._id,
        conceptType: 'cuota',
        schemeKey: 'estabilizacion'
    });
    assert.equal(payPartRes.status, 200);

    // Verificar que la cuota 1 quedó en status "parcial" con paidAmount = 1.000.000
    const inst1Post = await Installment.findById(inst1._id);
    assert.equal(inst1Post.status, 'parcial');
    assert.equal(inst1Post.paidAmount, 1000000);

    // 2.2 Intento de sobrepago de Cuota 1 (superando el saldo pendiente de $1.200.000) debe ser rechazado
    const overpayRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        installmentId: inst1._id,
        amount: 2000000,
        currency: 'ARS',
        accountId: accBanco._id
    });
    assert.equal(overpayRes.status, 400);
    assert.match(overpayRes.json.message, /supera el saldo pendiente/i);

    // 2.3 Pago del saldo restante de Cuota 1: $1.200.000
    const payRemainRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        installmentId: inst1._id,
        amount: 1200000,
        currency: 'ARS',
        accountId: accBanco._id,
        conceptType: 'cuota',
        schemeKey: 'estabilizacion'
    });
    assert.equal(payRemainRes.status, 200);

    const inst1Final = await Installment.findById(inst1._id);
    assert.equal(inst1Final.status, 'pagada');
    assert.equal(inst1Final.paidAmount, 2200000);
});

// Escenario 3: Pago dividido entre Efectivo y Transferencia (suma exacta)
await test('Escenario 3: Pago dividido entre Efectivo y Transferencia', async () => {
    const accEfectivo = await Account.create({
        name: 'Caja Fuerte Efectivo ARS',
        type: 'Efectivo',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });
    const accGalicia = await Account.create({
        name: 'Banco Galicia Corriente ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    const carSplit = await makeCar({
        brand: 'Chevrolet',
        name: 'Cruze LTZ',
        year: 2021,
        purchasePrice: 8000000,
        purchaseCurrency: 'ARS'
    });

    const saleSplit = await Sale.create({
        vehicleId: carSplit._id,
        salePrice: 11000000,
        saleCurrency: 'ARS',
        customerName: 'Laura Martínez',
        status: 'confirmada'
    });

    // 3.1 Intento de división cuya suma no coincide con el total debe fallar
    const badSumRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: saleSplit._id,
        amount: 5000000,
        currency: 'ARS',
        paymentSplits: [
            { accountId: accEfectivo._id, paymentMethod: 'efectivo', amount: 2000000 },
            { accountId: accGalicia._id, paymentMethod: 'transferencia', amount: 2000000 } // Suma 4M vs 5M
        ]
    });
    assert.equal(badSumRes.status, 400);
    assert.match(badSumRes.json.message, /debe coincidir exactamente/i);

    // 3.2 División válida: $3.000.000 en Efectivo + $2.000.000 en Galicia = $5.000.000
    const splitRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: saleSplit._id,
        amount: 5000000,
        currency: 'ARS',
        conceptType: 'entrega_inicial',
        schemeKey: 'estabilizacion',
        paymentSplits: [
            { accountId: accEfectivo._id, paymentMethod: 'efectivo', amount: 3000000 },
            { accountId: accGalicia._id, paymentMethod: 'transferencia', amount: 2000000 }
        ]
    });
    assert.equal(splitRes.status, 200);

    // Verificar que solo se creó 1 transacción con las divisiones asociadas
    const txDoc = await Transaction.findById(splitRes.json.transactionId);
    assert.ok(txDoc);
    assert.equal(txDoc.amount, 5000000);
    assert.equal(txDoc.paymentSplits.length, 2);

    // Verificar acreditación exacta en cada cuenta
    const efPost = await Account.findById(accEfectivo._id);
    const galPost = await Account.findById(accGalicia._id);
    assert.equal(efPost.balance, 3000000);
    assert.equal(galPost.balance, 2000000);
});

// Escenario 4: Venta sin margen distribuible (venta a costo o a pérdida)
await test('Escenario 4: Venta sin margen distribuible no genera asignaciones negativas', async () => {
    const accBank = await Account.create({
        name: 'Banco BBVA ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    const carLoss = await makeCar({
        brand: 'Peugeot',
        name: '208 Allure',
        year: 2020,
        purchasePrice: 10000000,
        purchaseCurrency: 'ARS'
    });

    // Vendido por $9.000.000 (Pérdida de -$1.000.000)
    const saleLoss = await Sale.create({
        vehicleId: carLoss._id,
        salePrice: 9000000,
        saleCurrency: 'ARS',
        customerName: 'Cliente Pérdida',
        status: 'confirmada'
    });

    const lossRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: saleLoss._id,
        amount: 9000000,
        currency: 'ARS',
        accountId: accBank._id,
        schemeKey: 'estabilizacion'
    });
    assert.equal(lossRes.status, 200);
    assert.equal(lossRes.json.summary.capitalRecovered, 9000000);
    assert.equal(lossRes.json.summary.distributableMargin, 0);
    assert.equal(lossRes.json.summary.marginDistributed, 0);
    assert.ok(lossRes.json.proposal.noMarginReason);
    assert.match(lossRes.json.proposal.noMarginReason, /sin ganancia neta/i);

    // Ningún destino debe tener asignación negativa
    for (const d of lossRes.json.summary.destinations) {
        assert.equal(d.amount, 0);
    }
});

// Escenario 5: Cobro pendiente de distribución y reparto posterior
await test('Escenario 5: Cobro pendiente de distribución y reparto posterior', async () => {
    const accBank = await Account.create({
        name: 'Banco Macro ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    // Vehículo SIN costo cargado
    const carNoCost = await makeCar({
        brand: 'Volkswagen',
        name: 'Golf TSI',
        year: 2018,
        price: 13000000,
        purchasePrice: null // Costo faltante
    });

    const saleMissingCost = await Sale.create({
        vehicleId: carNoCost._id,
        salePrice: 12000000,
        saleCurrency: 'ARS',
        customerName: 'Mariano Costa',
        status: 'confirmada'
    });

    // 5.1 Se registra el cobro: como falta el costo del auto, debe quedar como Pendiente de Distribución
    const pendRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        saleId: saleMissingCost._id,
        amount: 5000000,
        currency: 'ARS',
        accountId: accBank._id,
        conceptType: 'entrega_inicial',
        schemeKey: 'estabilizacion'
    });
    assert.equal(pendRes.status, 200);
    assert.equal(pendRes.json.isTreasuryDistributed, false);
    assert.equal(pendRes.json.summary.pendingDistribution, 5000000);
    assert.ok(pendRes.json.summary.pendingReason);

    // El dinero SÍ ingresó en la cuenta bancaria
    const accMid = await Account.findById(accBank._id);
    assert.equal(accMid.balance, 5000000);

    // 5.2 Se actualiza el costo del auto en el sistema
    await Car.findByIdAndUpdate(carNoCost._id, {
        purchasePrice: 8000000,
        purchaseCurrency: 'ARS'
    });

    // 5.3 Se distribuye el cobro pendiente desde la bandeja SIN volver a crear otro ingreso ni tocar la cuenta
    const distPendRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/distribute', {
        transactionId: pendRes.json.transactionId,
        useSuggested: true,
        schemeKey: 'estabilizacion'
    });
    assert.equal(distPendRes.status, 200);
    assert.equal(distPendRes.json.ok, true);

    // El saldo de la cuenta bancaria sigue intacto ($5.000.000)
    const accFinal = await Account.findById(accBank._id);
    assert.equal(accFinal.balance, 5000000);

    // La transacción ahora figura como distribuida
    const txUpdated = await Transaction.findById(pendRes.json.transactionId);
    assert.equal(txUpdated.isTreasuryDistributed, true);
    assert.equal(txUpdated.treasuryBreakdown.capitalRecoveredToStock, 5000000);
});

// Escenario 6: Doble envío y reintento con idempotencyKey
await test('Escenario 6: Doble envío e idempotencia sin duplicar saldos', async () => {
    const accGalicia = await Account.create({
        name: 'Galicia Idempotencia ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    const carIdemp = await makeCar({
        brand: 'Honda',
        name: 'Civic EX',
        year: 2020,
        purchasePrice: 10000000,
        purchaseCurrency: 'ARS'
    });

    const saleIdemp = await Sale.create({
        vehicleId: carIdemp._id,
        salePrice: 15000000,
        saleCurrency: 'ARS',
        customerName: 'Cliente Idemp',
        status: 'confirmada'
    });

    const myKey = 'IDEMP_TEST_UNIQUE_KEY_9999';

    // Primer intento
    const firstCall = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        idempotencyKey: myKey,
        saleId: saleIdemp._id,
        amount: 4000000,
        currency: 'ARS',
        accountId: accGalicia._id,
        schemeKey: 'estabilizacion'
    });
    assert.equal(firstCall.status, 200);
    assert.equal(firstCall.json.amount, 4000000);

    // Segundo intento idéntico (reintento de red o doble clic)
    const secondCall = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        idempotencyKey: myKey,
        saleId: saleIdemp._id,
        amount: 4000000,
        currency: 'ARS',
        accountId: accGalicia._id,
        schemeKey: 'estabilizacion'
    });
    assert.equal(secondCall.status, 200);
    assert.equal(secondCall.json.idempotentReplay, true);
    assert.equal(secondCall.json.transactionId, firstCall.json.transactionId);

    // El saldo en cuenta solo se acreditó 1 sola vez ($4.000.000)
    const accCheck = await Account.findById(accGalicia._id);
    assert.equal(accCheck.balance, 4000000);
});

// Escenario 7: Reversión y consistencia de saldos en cuentas, cuotas y cajas
await test('Escenario 7: Reversión y anulación integral de un cobro', async () => {
    const accEfectivo = await Account.create({
        name: 'Caja Fuerte Reversión ARS',
        type: 'Efectivo',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });
    const accBanco = await Account.create({
        name: 'Banco Reversión ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 0,
        isActive: true
    });

    const carRev = await makeCar({
        brand: 'Jeep',
        name: 'Renegade Longitude',
        year: 2021,
        purchasePrice: 9000000,
        purchaseCurrency: 'ARS'
    });

    const saleRev = await Sale.create({
        vehicleId: carRev._id,
        salePrice: 12000000,
        saleCurrency: 'ARS',
        customerName: 'Martín Reversión',
        status: 'confirmada'
    });

    const instRev = await Installment.create({
        saleId: saleRev._id,
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        amount: 3000000,
        currency: 'ARS',
        status: 'pendiente'
    });

    // Cobrar cuota con pago dividido: $1.000.000 en Efectivo + $2.000.000 en Banco = $3.000.000
    const cobroRes = await tCall('POST', '/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
        installmentId: instRev._id,
        amount: 3000000,
        currency: 'ARS',
        conceptType: 'cuota',
        schemeKey: 'estabilizacion',
        paymentSplits: [
            { accountId: accEfectivo._id, paymentMethod: 'efectivo', amount: 1000000 },
            { accountId: accBanco._id, paymentMethod: 'transferencia', amount: 2000000 }
        ]
    });
    assert.equal(cobroRes.status, 200);

    // Verificar estado previo a la reversión
    const efPre = await Account.findById(accEfectivo._id);
    const banPre = await Account.findById(accBanco._id);
    const instPre = await Installment.findById(instRev._id);
    assert.equal(efPre.balance, 1000000);
    assert.equal(banPre.balance, 2000000);
    assert.equal(instPre.status, 'pagada');
    assert.equal(instPre.paidAmount, 3000000);

    // Ejecutar reversión / anulación integral
    const revertRes = await tCall('POST', `/api/admin/tesoreria-estrategica/incomes/${cobroRes.json.transactionId}/revert`, {
        reason: 'Error de prueba en carga de cobro'
    });
    assert.equal(revertRes.status, 200);
    assert.equal(revertRes.json.ok, true);

    // 1. Saldos de cuentas físicas y bancarias vuelven a 0
    const efPost = await Account.findById(accEfectivo._id);
    const banPost = await Account.findById(accBanco._id);
    assert.equal(efPost.balance, 0);
    assert.equal(banPost.balance, 0);

    // 2. La cuota vuelve a estado "pendiente" con paidAmount = 0
    const instPost = await Installment.findById(instRev._id);
    assert.equal(instPost.status, 'pendiente');
    assert.equal(instPost.paidAmount, 0);

    // 3. La transacción figura como "anulado"
    const txPost = await Transaction.findById(cobroRes.json.transactionId);
    assert.equal(txPost.status, 'anulado');
    assert.equal(txPost.isTreasuryDistributionReversed, true);
});

await finish();
