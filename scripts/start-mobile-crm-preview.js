// Loopback-only disposable preview. Never loads deployment settings or sends email.
import http from 'node:http';
import { bootIsolatedReplica } from '../tests/integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = 3200;
const env = await bootIsolatedReplica({ listen: false });
const { seedMobileCrm, localPassword } = await import('../tests/fixtures/mobileCrmFixtures.js');
const fixtures = await seedMobileCrm(env.models);
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_API_URL = `http://${host}:${port}`;
delete process.env.TURBOPACK;
delete process.env.IS_TURBOPACK_TEST;
const next = (await import('next')).default;
const nextApp = next({ dev: true, webpack: true, hostname: host, port });
await nextApp.prepare();
const handleNext = nextApp.getRequestHandler();
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    if (url.pathname === '/__test-mail.json' || url.pathname === '/__test-fixtures.json') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(url.pathname === '/__test-mail.json' ? env.mailbox : {
            users: fixtures.users.map(user => ({ name: user.name, email: user.email, id: String(user._id) })),
            cars: fixtures.cars.map(car => ({ id: String(car._id), name: car.name, plate: car.plateOrVin })),
            accounts: fixtures.accounts.map(account => ({ id: String(account._id), name: account.name })),
            reservation: String(fixtures.reservation._id)
        }));
        return;
    }
    const nativeNextApi = /^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(url.pathname) || /^\/api-gestoria(\/|$)/.test(url.pathname);
    if (url.pathname.startsWith('/api/') && !nativeNextApi) return env.app(req, res);
    void handleNext(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end('Error de vista previa local.'); });
});
let stopping = false;
const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await nextApp.close();
    await env.stop();
    process.exit(0);
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
await new Promise(resolve => server.listen(port, host, resolve));
console.log(`Vista previa aislada: http://${host}:${port}/login`);
console.log('Usuario ficticio administrador: admin@example.test');
console.log(`Contraseña exclusiva de la prueba local: ${localPassword}`);
console.log(`Buzón local (sin correos reales): http://${host}:${port}/__test-mail.json`);
console.log('Ctrl+C elimina la base y los correos. No hay conexión con producción.');
