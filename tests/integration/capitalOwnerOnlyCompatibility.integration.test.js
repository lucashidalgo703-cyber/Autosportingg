// Validación integral del contrato Owner-Only conectado en la ruta financiera.
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, token, makeToken, base } = await boot();

let treasuryToken;
await test('El entorno ficticio puede preparar el PIN temporal de Tesorería', async () => {
    const setup = await call('POST', '/api/admin/tesoreria-estrategica/pin/setup', { pin: '4321', confirmPin: '4321' });
    assert.equal(setup.status, 200);
    treasuryToken = setup.json.treasuryToken;
    assert.ok(treasuryToken);
});

await test('Con contrato Owner-Only integrado, únicamente el propietario con PIN obtiene la proyección', async () => {
    // 1. Owner con PIN -> 200 OK con proyección
    const ownerWithPin = await call('GET', '/api/admin/capital-reinversion/projection', null, token, { 'x-treasury-token': treasuryToken });
    assert.equal(ownerWithPin.status, 200, 'owner con PIN debe acceder');
    assert.equal(ownerWithPin.json.ok, true);
    assert.ok(ownerWithPin.json.projection !== undefined, 'debe recibir proyección financiera');

    // 2. Owner sin PIN -> 403 requirePin: true
    const ownerNoPin = await call('GET', '/api/admin/capital-reinversion/projection', null, token, {});
    assert.equal(ownerNoPin.status, 403, 'owner sin PIN debe requerir PIN');
    assert.equal(ownerNoPin.json.requirePin, true);
    assert.equal(Object.hasOwn(ownerNoPin.json, 'projection'), false);

    // 3. Admin con PIN -> 403 ONLY_OWNER_ALLOWED
    const adminWithPin = await call('GET', '/api/admin/capital-reinversion/projection', null, makeToken('admin'), { 'x-treasury-token': treasuryToken });
    assert.equal(adminWithPin.status, 403, 'admin con PIN debe ser rechazado');
    assert.equal(adminWithPin.json.code, 'ONLY_OWNER_ALLOWED');
    assert.equal(Object.hasOwn(adminWithPin.json, 'projection'), false);

    // 4. Vendedor con PIN -> 403 ONLY_OWNER_ALLOWED
    const vendedorWithPin = await call('GET', '/api/admin/capital-reinversion/projection', null, makeToken('vendedor'), { 'x-treasury-token': treasuryToken });
    assert.equal(vendedorWithPin.status, 403, 'vendedor con PIN debe ser rechazado');
    assert.equal(vendedorWithPin.json.code, 'ONLY_OWNER_ALLOWED');
    assert.equal(Object.hasOwn(vendedorWithPin.json, 'projection'), false);

    // 5. Token inválido -> 401/403
    const invalidTokenRes = await call('GET', '/api/admin/capital-reinversion/projection', null, 'token-invalido', { 'x-treasury-token': treasuryToken });
    assert.ok([401, 403].includes(invalidTokenRes.status), 'token inválido debe ser rechazado');
    assert.equal(Object.hasOwn(invalidTokenRes.json, 'projection'), false);

    // 6. Acceso directo sin token -> 401
    const direct = await fetch(`${base}/api/admin/capital-reinversion/projection`);
    assert.equal(direct.status, 401, 'acceso directo sin token retorna 401');
    const directPayload = await direct.json().catch(() => ({}));
    assert.equal(Object.hasOwn(directPayload, 'projection'), false);
});

await finish();
