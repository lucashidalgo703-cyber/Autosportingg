// Mientras el contrato Owner-Only no esté en este clon, la ruta financiera debe fallar cerrada.
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

await test('Sin contrato Owner-Only, ninguna identidad obtiene la proyección financiera', async () => {
    const attempts = [
        ['owner con PIN', token, { 'x-treasury-token': treasuryToken }],
        ['owner sin PIN', token, {}],
        ['admin con PIN', makeToken('admin'), { 'x-treasury-token': treasuryToken }],
        ['vendedor', makeToken('vendedor'), { 'x-treasury-token': treasuryToken }],
        ['token inválido', 'token-invalido', { 'x-treasury-token': treasuryToken }]
    ];

    for (const [label, authToken, extraHeaders] of attempts) {
        const response = await call(
            'GET', '/api/admin/capital-reinversion/projection', null, authToken,
            extraHeaders
        );
        assert.equal(response.status, 503, `${label} debe permanecer bloqueado hasta integrar Seguridad`);
        assert.equal(response.json.code, 'OWNER_ONLY_SECURITY_CONTRACT_PENDING');
        assert.equal(Object.hasOwn(response.json, 'projection'), false, `${label} no debe recibir datos financieros`);
    }

    const direct = await fetch(`${base}/api/admin/capital-reinversion/projection`);
    const directPayload = await direct.json();
    assert.equal(direct.status, 503, 'El acceso directo a la API también falla cerrado');
    assert.equal(directPayload.code, 'OWNER_ONLY_SECURITY_CONTRACT_PENDING');
    assert.equal(Object.hasOwn(directPayload, 'projection'), false);
});

await finish();
