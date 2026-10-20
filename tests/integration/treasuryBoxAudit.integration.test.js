import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, token } = await boot();
const { default: TreasuryBox } = await import('../../src/models/TreasuryBox.js');
const { default: TreasuryAuditLog } = await import('../../src/models/TreasuryAuditLog.js');

let treasuryPinToken = null;
const tCall = (method, path, body) => call(
    method,
    path,
    body,
    token,
    treasuryPinToken ? { 'x-treasury-token': treasuryPinToken } : {}
);

console.log('=== PRUEBAS DE INTEGRACIÓN: EDICIÓN DE CAJAS, TRASPASOS, AUDITORÍA Y REVERSIONES ===');

await test('0. Autenticación y configuración inicial de PIN en Tesorería', async () => {
    const pinRes = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', {
        pin: '1234',
        confirmPin: '1234'
    }, token);

    assert.equal(pinRes.status, 200);
    assert.equal(pinRes.json.ok, true);
    treasuryPinToken = pinRes.json.treasuryToken;
    assert.ok(treasuryPinToken, 'Debe devolver un treasuryToken válido');

    // Inicializar cajas por defecto
    const initRes = await tCall('GET', '/api/admin/tesoreria-estrategica/data');
    assert.equal(initRes.status, 200);
});

await test('1. Ajuste manual de saldo con motivo obligatorio y vista previa', async () => {
    await TreasuryBox.findOneAndUpdate(
        { key: 'operativa' },
        { name: 'Caja Operativa', balanceARS: 500000, balanceUSD: 1000 },
        { upsert: true }
    );

    // Intento 1: Rechazo si el motivo está vacío o con solo espacios
    const emptyReasonRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/adjust', {
        boxKey: 'operativa',
        currency: 'ARS',
        newBalance: 750000,
        reason: '   '
    });
    assert.equal(emptyReasonRes.status, 400);
    assert.equal(emptyReasonRes.json.ok, false);
    assert.match(emptyReasonRes.json.message, /motivo.*obligatorio/i);

    // Intento 2: Rechazo si el saldo resultante es negativo
    const negRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/adjust', {
        boxKey: 'operativa',
        currency: 'ARS',
        newBalance: -50000,
        reason: 'Ajuste de prueba erróneo'
    });
    assert.equal(negRes.status, 400);
    assert.match(negRes.json.message, /negativo/i);

    // Intento 3: Vista previa de ajuste
    const previewRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/adjust/preview', {
        boxKey: 'operativa',
        currency: 'ARS',
        newBalance: 800000,
        reason: 'Ajuste de capital operativo'
    });
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.json.ok, true);
    assert.equal(previewRes.json.preview.previousBalance, 500000);
    assert.equal(previewRes.json.preview.newBalance, 800000);
    assert.equal(previewRes.json.preview.diff, 300000);

    // Intento 4: Ejecución confirmada del ajuste
    const confirmRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/adjust', {
        boxKey: 'operativa',
        currency: 'ARS',
        newBalance: 800000,
        reason: 'Ajuste de capital operativo mensual'
    });
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.json.ok, true);

    const updatedBox = await TreasuryBox.findOne({ key: 'operativa' });
    assert.equal(updatedBox.balanceARS, 800000);

    const log = await TreasuryAuditLog.findOne({
        boxKey: 'operativa',
        actionType: 'ajuste_saldo'
    }).sort({ date: -1 });

    assert.ok(log, 'Debe haber un log de auditoría');
    assert.equal(log.amount, 300000);
    assert.equal(log.balanceBefore, 500000);
    assert.equal(log.balanceAfter, 800000);
    assert.equal(log.reason, 'Ajuste de capital operativo mensual');
});

await test('2. Modificación de configuración de caja con motivo obligatorio', async () => {
    // Intento 1: Rechazo sin motivo
    const noReasonRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/config', {
        boxKey: 'operativa',
        name: 'Caja Operativa Central',
        targetPercent: 25,
        reason: ''
    });
    assert.equal(noReasonRes.status, 400);

    // Intento 2: Modificación válida
    const validRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/config', {
        boxKey: 'operativa',
        name: 'Caja Operativa Central',
        targetPercent: 25,
        monthlyBudgetARS: 1500000,
        reason: 'Actualización de presupuesto operativo Q4'
    });
    assert.equal(validRes.status, 200);
    assert.equal(validRes.json.ok, true);

    const box = await TreasuryBox.findOne({ key: 'operativa' });
    assert.equal(box.name, 'Caja Operativa Central');
    assert.equal(box.targetPercent, 25);
    assert.equal(box.monthlyBudgetARS, 1500000);

    const configLog = await TreasuryAuditLog.findOne({
        boxKey: 'operativa',
        actionType: 'edicion_configuracion'
    }).sort({ date: -1 });

    assert.ok(configLog);
    assert.equal(configLog.reason, 'Actualización de presupuesto operativo Q4');
    assert.ok(configLog.fieldsModified.some(f => f.fieldName === 'name'));
    assert.ok(configLog.fieldsModified.some(f => f.fieldName === 'targetPercent'));
});

await test('3. Transferencia entre cajas con auditoría y control de fondos', async () => {
    await TreasuryBox.findOneAndUpdate(
        { key: 'reserva' },
        { name: 'Caja Reserva', balanceARS: 100000 },
        { upsert: true }
    );

    // Rechazo si saldo insuficiente
    const insufRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/transfer', {
        fromBoxKey: 'operativa',
        toBoxKey: 'reserva',
        currency: 'ARS',
        amount: 99999999,
        reason: 'Traspaso excesivo'
    });
    assert.equal(insufRes.status, 400);
    assert.match(insufRes.json.message, /insuficiente/i);

    // Traspaso válido con motivo
    const transferRes = await tCall('POST', '/api/admin/tesoreria-estrategica/boxes/transfer', {
        fromBoxKey: 'operativa',
        toBoxKey: 'reserva',
        currency: 'ARS',
        amount: 200000,
        reason: 'Asignación de colchón a reserva'
    });
    assert.equal(transferRes.status, 200);
    assert.equal(transferRes.json.ok, true);

    const opBox = await TreasuryBox.findOne({ key: 'operativa' });
    const resBox = await TreasuryBox.findOne({ key: 'reserva' });

    assert.equal(opBox.balanceARS, 600000);
    assert.equal(resBox.balanceARS, 300000);

    const txLogs = await TreasuryAuditLog.find({
        actionType: 'transferencia_entre_cajas'
    }).sort({ date: -1 }).limit(2);

    assert.equal(txLogs.length, 2);
    assert.equal(txLogs[0].operationId, txLogs[1].operationId);
});

await test('4. Reversión de ajuste y de transferencia', async () => {
    const lastAdjLog = await TreasuryAuditLog.findOne({
        actionType: 'ajuste_saldo',
        isReversal: false
    }).sort({ date: -1 });

    assert.ok(lastAdjLog);

    const revertAdjRes = await tCall('POST', '/api/admin/tesoreria-estrategica/adjustments/revert', {
        logId: lastAdjLog._id.toString(),
        reason: 'Corrección: ajuste cargado por error'
    });
    assert.equal(revertAdjRes.status, 200);
    assert.equal(revertAdjRes.json.ok, true);

    const revLog = await TreasuryAuditLog.findOne({
        revertedLogId: lastAdjLog._id
    });
    assert.ok(revLog);
    assert.equal(revLog.isReversal, true);
    assert.equal(revLog.reason, 'Corrección: ajuste cargado por error');

    const doubleRevRes = await tCall('POST', '/api/admin/tesoreria-estrategica/adjustments/revert', {
        logId: lastAdjLog._id.toString(),
        reason: 'Intento duplicado'
    });
    assert.equal(doubleRevRes.status, 400);
    assert.match(doubleRevRes.json.message, /ya fue revertida/i);
});

await test('5. Consulta de Historial y Auditoría con filtros y paginación', async () => {
    const historyRes = await tCall('GET', '/api/admin/tesoreria-estrategica/history?limit=10');

    assert.equal(historyRes.status, 200);
    assert.equal(historyRes.json.ok, true);
    assert.ok(Array.isArray(historyRes.json.items));
    assert.ok(historyRes.json.total >= 4);

    const filterBoxRes = await tCall('GET', '/api/admin/tesoreria-estrategica/history?boxKey=operativa');
    assert.equal(filterBoxRes.status, 200);
    assert.ok(filterBoxRes.json.items.every(item => item.boxKey === 'operativa' || item.targetBoxKey === 'operativa'));

    const filterActionRes = await tCall('GET', '/api/admin/tesoreria-estrategica/history?actionType=edicion_configuracion');
    assert.equal(filterActionRes.status, 200);
    assert.ok(filterActionRes.json.items.every(item => item.actionType === 'edicion_configuracion'));
});

await finish();
