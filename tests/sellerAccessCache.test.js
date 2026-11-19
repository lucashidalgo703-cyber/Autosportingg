import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const handlers = {}, deleted = [];
let cacheReads = 0, networkCalls = 0, claimed = 0;
const context = {
    URL, Response,
    self: { location: { origin: 'https://crm.example.test' }, navigator: { onLine: false },
        addEventListener: (name, callback) => { handlers[name] = callback; },
        skipWaiting() {}, clients: { claim: async () => { claimed++; } } },
    caches: { keys: async () => ['autosporting-offline-shell-v3', 'autosporting-offline-shell-v4'],
        delete: async key => { deleted.push(key); return true; },
        open: async () => { cacheReads++; throw new Error('Internal API must never read the shared cache'); } },
    fetch: async () => { networkCalls++; throw new Error('Fictional offline connection'); }
};
vm.runInNewContext(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
let activation;
handlers.activate({ waitUntil: promise => { activation = promise; } });
await activation;
assert.deepEqual(deleted, ['autosporting-offline-shell-v3']);
assert.equal(claimed, 1);

for (const route of ['/api/admin/sales', '/api/admin/reservations', '/api/admin/cars?tab=historial',
    '/api/admin/dashboard', '/api/stats/dashboard', '/api/admin/stock/negotiation',
    '/API/ADMIN/CARS', '/api/admin/auth/me', '/api/buyer-portal/files/example', '/api/vehicle-invoice-files/example?access=private-test', '/portal/example']) {
    let intercepted = false;
    handlers.fetch({ request: { method: 'GET', url: 'https://crm.example.test' + route,
        mode: 'cors', headers: { get: () => '' } }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, 'Never serve cached private data for ' + route);
}
assert.equal(cacheReads, 0);
assert.equal(networkCalls, 0);
console.log('PASS: previous shared cache removed; internal APIs never use offline cache fallback.');
