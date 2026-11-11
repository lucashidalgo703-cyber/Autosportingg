// API real con MongoDB descartable en loopback; no carga datos ni proveedores de producción.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import { after, before, beforeEach, describe, test } from 'node:test';
import { clientTodayKey } from '../../src/utils/clientCommercial.js';

const dbName = `autosporting_client_test_${crypto.randomBytes(6).toString('hex')}`;
const nativeFetch = globalThis.fetch;
let replSet, mongoose, jwt, server, base, models, seller;
const token = (role = 'owner', permissions, userId = seller?._id) => jwt.sign({ id: String(userId), role, username: `qa_${role}`, ...(permissions ? { permissions } : {}) }, process.env.JWT_SECRET, { expiresIn: '10m' });
const day = offset => new Date(Date.parse(`${clientTodayKey()}T00:00:00.000Z`) + offset * 86400000).toISOString().slice(0, 10);
async function call(method, route, body, auth = token()) {
    const response = await fetch(`${base}${route}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
}
const payload = overrides => ({ firstName: 'Persona ficticia', phone: '02975550101', pipelineStage: 'contactado', ...overrides });

describe('Agenda comercial de clientes con persistencia real', { concurrency: false }, () => {
    before(async () => {
        for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
            assert.equal(await access(name).then(() => true, () => false), false, 'La suite requiere un checkout sin credenciales .env activas');
        }
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { windowsHide: true }, args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16'] }, instanceOpts: [{ ip: '127.0.0.1', launchTimeout: 180000 }] });
        process.env.MONGODB_URI = replSet.getUri(dbName);
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        process.env.NODE_ENV = 'production'; process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
        for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'MONGODB_DNS_SERVERS', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
        globalThis.fetch = (input, options) => {
            const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
            assert.equal(target.origin, base, 'Ninguna prueba consulta un proveedor externo');
            return nativeFetch(input, options);
        };
        mongoose = (await import('mongoose')).default; mongoose.set('autoCreate', false);
        jwt = (await import('jsonwebtoken')).default;
        const app = (await import('../../server.js')).default;
        models = Object.fromEntries(await Promise.all(['Client', 'Lead', 'Sale', 'AdminUser', 'AuditLog', 'CrmTask', 'Car', 'SavedStockView'].map(async name => [name, (await import(`../../src/models/${name}.js`)).default])));
        await (await import('../../src/config/db.js')).default();
        assert.equal(mongoose.connection.host, '127.0.0.1'); assert.equal(mongoose.connection.name, dbName);
        await Promise.all(Object.values(models).map(Model => Model.createCollection()));
        server = app.listen({ port: 0, host: '127.0.0.1' }); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 300000 });
    beforeEach(async () => {
        await Promise.all(Object.values(models).map(Model => Model.deleteMany({})));
        seller = await models.AdminUser.create({ name: 'Vendedor ficticio', email: 'ventas@autosporting.test', passwordHash: crypto.randomBytes(32).toString('hex'), role: 'ventas', active: true });
    });
    after(async () => {
        globalThis.fetch = nativeFetch;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        if (mongoose) await mongoose.disconnect();
        if (replSet) await replSet.stop();
    });

    test('creación y edición conservan campos comerciales, responsable y próximo paso auditado sin crear tarea', async () => {
        const input = payload({ reason: 'entro_puerta', assignedTo: String(seller._id), nextAction: 'Revisar alternativas', nextActionDate: day(1), lastContactDate: day(0), vehicleOfInterest: 'Toyota QA', description: 'Busca automático', brand: 'Toyota', model: 'Corolla', currency: 'ARS', maxBudget: 0, yearFrom: 2020, yearTo: 2026 });
        const created = await call('POST', '/api/admin/clients', input); assert.equal(created.status, 201, JSON.stringify(created.body));
        const loaded = await call('GET', `/api/admin/clients/${created.body._id}`);
        assert.equal(loaded.body.assignedTo._id, String(seller._id)); assert.equal(loaded.body.maxBudget, 0); assert.equal(loaded.body.description, input.description); assert.equal(loaded.body.nextActionDate.slice(0, 10), day(1));
        const changed = await call('PATCH', `/api/admin/clients/${created.body._id}`, { pipelineStage: 'con_pedido', nextAction: 'Llamar mañana', nextActionDate: day(2), notes: 'Conservar nota' });
        assert.equal(changed.status, 200); assert.equal(changed.body.pipelineStage, 'con_pedido'); assert.equal(changed.body.nextAction, 'Llamar mañana');
        assert.ok(changed.body.clientAuditLog.some(log => log.field === 'nextActionDate'));
        assert.equal(await models.CrmTask.countDocuments(), 0); assert.equal(await models.Sale.countDocuments(), 0);
        const minimum = await call('POST', '/api/admin/clients', { firstName: '  Alta mínima ficticia  ' });
        assert.equal(minimum.status, 201, JSON.stringify(minimum.body)); assert.equal(minimum.body.fullName, 'Alta mínima ficticia');
        assert.ok(!minimum.body.phone); assert.ok(!minimum.body.email);
        const whitespaceName = await call('POST', '/api/admin/clients', { firstName: '   ', lastName: 'Apellido' });
        assert.equal(whitespaceName.status, 400);
    });
    test('las limpiezas opcionales persisten y no convierten falta de presupuesto en cero', async () => {
        const created = await call('POST', '/api/admin/clients', payload({ assignedTo: String(seller._id), nextActionDate: day(1), maxBudget: 2000 }));
        const changed = await call('PATCH', `/api/admin/clients/${created.body._id}`, { assignedTo: '', nextActionDate: '', nextAction: '', maxBudget: '', yearFrom: '', yearTo: '' });
        assert.equal(changed.status, 200); assert.equal(changed.body.assignedTo, null); assert.equal(changed.body.nextActionDate, null); assert.equal(changed.body.maxBudget, null);
    });
    test('editar notas de un registro con etapa anterior conserva su valor y sigue apareciendo en la columna equivalente', async () => {
        const client = await models.Client.create(payload({ pipelineStage: 'propuesta_enviada' }));
        const changed = await call('PATCH', `/api/admin/clients/${client._id}`, { notes: 'Nota actualizada' });
        assert.equal(changed.status, 200); assert.equal(changed.body.pipelineStage, 'propuesta_enviada');
        const list = await call('GET', '/api/admin/clients'); assert.equal(list.body.pipelineCounts.negociacion, 1);
    });
    test('prioridades y resumen se filtran antes de paginar y no desaparece el cliente de segunda página', async () => {
        await models.Client.create(Array.from({ length: 24 }, (_, index) => payload({ firstName: `Persona ${index}`, type: index === 23 ? 'comprador' : 'potencial', pipelineStage: 'contactado', nextActionDate: day(index === 23 ? -1 : 2) })));
        await models.Client.create(payload({ firstName: 'Primera atención', pipelineStage: 'nuevo' }));
        const first = await call('GET', '/api/admin/clients?attention=todos&page=1&limit=20');
        const second = await call('GET', '/api/admin/clients?attention=todos&page=2&limit=20');
        assert.equal(first.body.total, 25); assert.equal(first.body.clients.length, 20); assert.equal(second.body.clients.length, 5);
        assert.equal(first.body.summary.compradores, 1); assert.equal(first.body.priorityCounts.hoy, 2); assert.equal(first.body.pipelineCounts.contactado, 24);
        const today = await call('GET', '/api/admin/clients?attention=hoy&limit=20'); assert.equal(today.body.total, 2);
        assert.deepEqual(new Set(today.body.clients.map(client => client.fullName)), new Set(['Persona 23', 'Primera atención']));
    });
    test('cerrado, perdido, inactivo y bloqueado quedan fuera de prioridades sin desaparecer de Todos', async () => {
        await models.Client.create([{ pipelineStage: 'cerrado' }, { pipelineStage: 'perdido' }, { status: 'inactivo' }, { status: 'bloqueado' }].map(overrides => payload({ nextActionDate: day(-1), ...overrides })));
        const list = await call('GET', '/api/admin/clients?attention=hoy'); assert.equal(list.body.total, 0); assert.equal(list.body.priorityCounts.todos, 4);
        const noDate = await call('GET', '/api/admin/clients?attention=sinfecha'); assert.equal(noDate.body.total, 0);
    });
    test('segmentos existentes, responsable y búsqueda literal se conservan, incluida compatibilidad limit1000', async () => {
        await models.Client.create([payload({ firstName: 'Literal .*', assignedTo: seller._id }), payload({ firstName: 'Ajeno', source: 'web', dniCuit: 'QA-123', description: 'Sedán especial' })]);
        assert.equal((await call('GET', '/api/admin/clients?segment=mis-clientes')).body.total, 1);
        assert.equal((await call('GET', `/api/admin/clients?assignedTo=${seller._id}`)).body.total, 1);
        assert.equal((await call('GET', '/api/admin/clients?search=.*')).body.total, 1);
        assert.equal((await call('GET', '/api/admin/clients?search=QA-123')).body.total, 1);
        assert.equal((await call('GET', '/api/admin/clients?search=especial')).body.total, 1);
        assert.equal((await call('GET', '/api/admin/clients?segment=sin-contactar')).body.total, 0);
        assert.equal((await call('GET', '/api/admin/clients?segment=contactados')).body.total, 2);
        const compatible = await call('GET', '/api/admin/clients?limit=1000'); assert.equal(compatible.status, 200); assert.equal(compatible.body.total, 2); assert.match(compatible.headers.get('cache-control'), /no-store/);
    });
    test('lectura no edita etapas ni datos y sin sesión o permiso no entrega clientes', async () => {
        const client = await models.Client.create(payload()); const before = JSON.stringify(await models.Client.findById(client._id).lean());
        assert.equal((await call('GET', '/api/admin/clients', undefined, null)).status, 401);
        assert.equal((await call('GET', '/api/admin/clients', undefined, token('administrativo', ['agenda.read']))).status, 403);
        assert.equal((await call('GET', '/api/admin/clients', undefined, token('solo_lectura'))).status, 200);
        assert.equal((await call('PATCH', `/api/admin/clients/${client._id}`, { pipelineStage: 'cerrado' }, token('solo_lectura'))).status, 403);
        assert.equal(JSON.stringify(await models.Client.findById(client._id).lean()), before);
    });
    test('rechaza importes, años, fechas, etapas y responsable inválidos sin persistencia parcial', async () => {
        const client = await models.Client.create(payload()); const before = JSON.stringify(await models.Client.findById(client._id).lean());
        for (const input of [{ maxBudget: -1 }, { maxBudget: 'NaN' }, { yearFrom: 2026, yearTo: 2020 }, { yearFrom: 2020.5 }, { nextActionDate: '2026-02-30' }, { nextActionDate: '2026-11-10T99:00:00Z' }, { pipelineStage: 'inventada' }, { assignedTo: 'vendedor1' }, { assignedTo: String(new mongoose.Types.ObjectId()) }]) {
            const result = await call('PATCH', `/api/admin/clients/${client._id}`, input); assert.equal(result.status, 400, JSON.stringify(input));
        }
        assert.equal(JSON.stringify(await models.Client.findById(client._id).lean()), before);
    });
    test('las búsquedas guardadas son personales y preservan filtros y presentación entre consultas', async () => {
        const own = token('admin', ['stock.read']);
        const other = token('admin', ['stock.read'], new mongoose.Types.ObjectId());
        const saved = await call('POST', '/api/admin/stock-views', { name: 'Automáticos QA', filters: { transmission: 'Automática', minYear: 2020, maxYear: 2026, responsible: String(seller._id), origin: 'owned', vista: 'inventario', presentacion: 'cards', secret: 'no guardar' } }, own);
        assert.equal(saved.status, 201, JSON.stringify(saved.body));
        assert.equal(saved.body.filters.presentacion, 'cards'); assert.equal(saved.body.filters.minYear, 2020); assert.equal(saved.body.filters.secret, undefined);
        assert.equal((await call('GET', '/api/admin/stock-views', undefined, other)).body.views.length, 0);
        assert.equal((await call('DELETE', '/api/admin/stock-views/' + saved.body._id, undefined, other)).status, 404);
        const loaded = await call('GET', '/api/admin/stock-views', undefined, own); assert.equal(loaded.body.views.length, 1);
        assert.equal((await call('POST', '/api/admin/stock-views', { name: ' automáticos qa ', filters: { minYear: 2022, presentacion: 'detailed' } }, own)).status, 201);
        assert.equal(await models.SavedStockView.countDocuments(), 1);
        assert.equal((await call('POST', '/api/admin/stock-views', { name: 'Inválida', filters: { minYear: 2022.5 } }, own)).status, 400);
        assert.equal((await call('GET', '/api/admin/stock-views', undefined, token('administrativo', ['clientes.read']))).status, 403);
        assert.equal((await call('DELETE', '/api/admin/stock-views/' + saved.body._id, undefined, own)).status, 200);
        assert.equal(await models.SavedStockView.countDocuments(), 0);
    });
    test('ordena el conjunto antes de paginar y no expone conteos de ventas sin permiso', async () => {
        const [a, z] = await models.Client.create([payload({ fullName: 'Alfa QA', firstName: 'Alfa', gender: 'mujer', segment: 'vip' }), payload({ fullName: 'Zulu QA', firstName: 'Zulu', gender: 'hombre', segment: 'regular' })]);
        await models.Sale.create({ clientId: a._id, status: 'entregada', salePrice: 1000, saleCurrency: 'USD' });
        const sorted = await call('GET', '/api/admin/clients?sort=name_desc&limit=1');
        assert.equal(sorted.body.clients[0]._id, String(z._id)); assert.equal(sorted.body.total, 2);
        const filtered = await call('GET', '/api/admin/clients?gender=mujer&tier=vip');
        assert.equal(filtered.body.total, 1); assert.equal(filtered.body.clients[0].operationsCount, 1);
        const limited = await call('GET', '/api/admin/clients?gender=mujer', undefined, token('admin', ['clientes.read']));
        assert.equal(limited.body.clients[0].operationsCount, undefined);
    });
    test('contactar no retrocede etapas y los intentos sin respuesta no se convierten en contactos', async () => {
        const first = await models.Client.create(payload({ pipelineStage: 'sin_contactar' }));
        assert.equal((await call('GET', '/api/admin/clients?attention=sinfecha')).body.total, 0);
        const missed = await call('PATCH', '/api/admin/clients/' + first._id, { newInteraction: { type: 'llamada', note: 'No respondió en QA', outboundNoReply: true } });
        assert.equal(missed.body.lastContactDate, null); assert.equal(missed.body.pipelineStage, 'sin_contactar');
        assert.equal((await call('GET', '/api/admin/clients?segment=sin-contactar')).body.total, 1);
        assert.equal((await call('GET', '/api/admin/clients?segment=contactados')).body.total, 0);
        const contacted = await call('PATCH', '/api/admin/clients/' + first._id, { newInteraction: { type: 'otro', note: 'Contacto confirmado desde directorio', outboundNoReply: false } });
        assert.equal(contacted.body.pipelineStage, 'contactado'); assert.ok(contacted.body.lastContactDate);
        assert.equal((await call('GET', '/api/admin/clients?segment=contactados')).body.total, 1);
        assert.equal((await call('GET', '/api/admin/clients?segment=sin-contactar')).body.total, 0);
        await models.Client.updateOne({ _id: first._id }, { $set: { pipelineStage: 'negociacion' } });
        const advanced = await call('PATCH', '/api/admin/clients/' + first._id, { newInteraction: { type: 'otro', note: 'Nuevo contacto confirmado' } });
        assert.equal(advanced.body.pipelineStage, 'negociacion');
    });
});
