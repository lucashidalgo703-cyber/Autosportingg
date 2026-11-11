import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registryRefundPathAllowed, requestRegistryRefundJson } from '../src/utils/registryRefundRequest.js';
test('transporte permite origen Gestoría y lectura de cuentas, sin permitir rutas o escrituras de cuentas arbitrarias', () => {
    const id = 'a'.repeat(24);
    assert.equal(registryRefundPathAllowed(`/api/admin/gestoria/${id}/registry-refunds`, 'POST'), true);
    assert.equal(registryRefundPathAllowed('/api/admin/finance/registry-refunds?page=1'), true);
    assert.equal(registryRefundPathAllowed(`/api/admin/finance/registry-refunds/${id}`, 'PATCH'), true);
    assert.equal(registryRefundPathAllowed('/api/admin/accounts'), true);
    assert.equal(registryRefundPathAllowed('/api/admin/accounts', 'POST'), false);
    assert.equal(registryRefundPathAllowed('/api/admin/clients'), false);
    assert.equal(registryRefundPathAllowed('https://example.test/api/admin/finance/registry-refunds'), false);
});
test('solicitud de origen envía JSON autorizado y descarta respuesta cuando cambia la sesión', async () => {
    const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
    globalThis.localStorage = { getItem: () => 'qa_token' }; let captured;
    globalThis.fetch = async (url, init) => { captured = { url, init }; return new Response(JSON.stringify({ item: { status: 'por_confirmar' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }); };
    try {
        const args = { path: `/api/admin/gestoria/${'a'.repeat(24)}/registry-refunds`, method: 'POST', payload: { amount: 10, idempotencyKey: 'same-id' }, token: 'qa_token' };
        const result = await requestRegistryRefundJson(args); assert.equal(result.item.status, 'por_confirmar'); assert.equal(captured.init.headers.Authorization, 'Bearer qa_token'); assert.equal(JSON.parse(captured.init.body).idempotencyKey, 'same-id');
        await assert.rejects(() => requestRegistryRefundJson({ ...args, isCurrent: () => false }), { name: 'AbortError' });
    } finally { globalThis.fetch = originalFetch; if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage; }
});
