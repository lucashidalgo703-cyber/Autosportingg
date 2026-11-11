// Vista previa local para QA. Todos los registros y accesos son ficticios.
// Requiere un build previo: NEXT_PUBLIC_API_URL=http://127.0.0.1:4173 npm run build
// Ejecutar únicamente cuando se quiera iniciar el entorno: node scripts/start-crm-parity-preview.mjs
import crypto from 'node:crypto';
import http from 'node:http';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '127.0.0.1';
const FRONTEND_PORT = 4173;
const API_PORT = 4174;
const OWNER_EMAIL = 'owner@autosporting.test';
const OWNER_PASSWORD = 'PreviewOwner2026!';
const SELLER_EMAIL = 'ventas@autosporting.test';
const SELLER_PASSWORD = 'PreviewVentas2026!';
const READER_EMAIL = 'consulta@autosporting.test';
const READER_PASSWORD = 'PreviewConsulta2026!';
let replicaSet;
let mongoose;
let nextApp;
let frontendServer;
let apiServer;
let stopping = false;

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function assertNoEnvFiles() {
    // Solo verifica existencia; no carga ni lee archivos de credenciales.
    for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
        const exists = await access(path.join(ROOT, name)).then(() => true, () => false);
        if (exists) throw new Error(`Retirá ${name} del checkout aislado antes de iniciar esta vista previa.`);
    }
}

function isolateEnvironment() {
    for (const key of Object.keys(process.env)) {
        if (/^(MONGO|DATABASE_|JWT_|TWO_FACTOR_|CLOUDINARY_|WHATSAPP_|META_|GMAIL_|SMTP_|EMAIL_|OPENAI_|ANTHROPIC_|ARTURITO_|INFOAUTO_|REDIS_|UPSTASH_|CRON_|GOOGLE_APPLICATION_CREDENTIALS)/i.test(key) && !key.startsWith('MONGOMS_')) {
            delete process.env[key];
        }
    }
    process.env.NODE_ENV = 'production'; // evita app.listen del módulo Express importado
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
    process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    process.env.NEXT_PUBLIC_API_URL = `http://${HOST}:${FRONTEND_PORT}`;
    process.env.ENABLE_LOCAL_PROXY = 'false';
    process.env.LOCAL_DECOUPLED_PROXY = 'false';
    delete process.env.LOCAL_BACKEND_URL;
    delete process.env.VERCEL;
    process.env.PORT = String(API_PORT);
    process.chdir(ROOT);
}

function blockExternalApiFetch() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, options) => {
        const value = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
        const url = new URL(value, `http://${HOST}:${FRONTEND_PORT}`);
        // Conserva fetch internos de Next y ambas superficies locales. No altera
        // el runner Mongo, cuyo descargador usa HTTPS propio del paquete.
        if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return originalFetch(input, options);
        throw new Error('Proveedor externo deshabilitado en la vista previa aislada.');
    };
}

async function listen(server, port) {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, HOST, () => { server.off('error', reject); resolve(); });
    });
}

async function closeServer(server) {
    if (!server?.listening) return;
    await new Promise((resolve) => {
        const timer = setTimeout(() => { server.closeAllConnections?.(); resolve(); }, 2000);
        timer.unref();
        server.close(() => { clearTimeout(timer); resolve(); });
        server.closeIdleConnections?.();
    });
}

async function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    await Promise.allSettled([closeServer(frontendServer), closeServer(apiServer)]);
    await nextApp?.close().catch(() => {});
    await mongoose?.disconnect().catch(() => {});
    await replicaSet?.stop().catch(() => {});
    process.exit(code);
}
process.once('SIGINT', () => { void shutdown(0); });
process.once('SIGTERM', () => { void shutdown(0); });

async function startPreview() {
    await assertNoEnvFiles();
    isolateEnvironment();
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replicaSet = new MongoMemoryReplSet({
        replSet: { count: 1, storageEngine: 'wiredTiger', ip: HOST, name: `preview_${crypto.randomBytes(4).toString('hex')}` },
        instanceOpts: [{ ip: HOST, launchTimeout: 180000, args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16'] }],
        binary: process.env.MONGOMS_DOWNLOAD_DIR ? { downloadDir: process.env.MONGOMS_DOWNLOAD_DIR } : {}
    });
    console.log('[QA AISLADA] Iniciando réplica local de MongoDB; no se usan datos de producción.');
    await replicaSet.start();
    process.env.MONGODB_URI = replicaSet.getUri(`crm_parity_${crypto.randomBytes(6).toString('hex')}`);
    if (!process.env.MONGODB_URI.startsWith(`mongodb://${HOST}:`)) throw new Error('La base de QA no está vinculada a loopback.');
    blockExternalApiFetch();

    // Se importan servidor y modelos solo después de fijar la URI y claves de QA.
    mongoose = (await import('mongoose')).default;
    mongoose.set('autoCreate', false);
    const { default: app } = await import('../server.js');
    const { default: connectDB } = await import('../src/config/db.js');
    const { default: AdminUser } = await import('../src/models/AdminUser.js');
    const { default: Account } = await import('../src/models/Account.js');
    const { default: Car } = await import('../src/models/Car.js');
    const { default: Client } = await import('../src/models/Client.js');
    const { default: Sale } = await import('../src/models/Sale.js');
    const { default: Installment } = await import('../src/models/Installment.js');
    const { default: Transaction } = await import('../src/models/Transaction.js');
    const { default: CrmSettings } = await import('../src/models/CrmSettings.js');
    const { default: CrmTask } = await import('../src/models/CrmTask.js');
    const { default: CommunicationLog } = await import('../src/models/CommunicationLog.js');
    const { default: Pedido } = await import('../src/models/Pedido.js');
    const { getArgentinaDateKey } = await import('../src/utils/cashProjection.js');
    await connectDB();

    const today = getArgentinaDateKey();
    const day = (offset) => new Date(Date.parse(`${today}T00:00:00.000Z`) + offset * 86400000);
    const intakeDay = (offset) => new Date(day(offset).getTime() + 3 * 3600000);
    const [owner, seller] = await AdminUser.create([
        { name: 'Administración de prueba', email: OWNER_EMAIL, passwordHash: hashPassword(OWNER_PASSWORD), role: 'owner', active: true },
        { name: 'Ventas de prueba', email: SELLER_EMAIL, passwordHash: hashPassword(SELLER_PASSWORD), role: 'ventas', active: true },
        { name: 'Consulta de prueba', email: READER_EMAIL, passwordHash: hashPassword(READER_PASSWORD), role: 'solo_lectura', active: true }
    ]);
    const [ars, usd] = await Account.create([
        { name: 'Caja de prueba ARS', type: 'Efectivo', currency: 'ARS', balance: 8500000, isActive: true },
        { name: 'Cuenta de prueba USD', type: 'Banco', currency: 'USD', balance: 12000, isActive: true }
    ]);
    const client = await Client.create({
        fullName: 'Cliente de demostración', email: 'cliente@autosporting.test', type: 'comprador',
        source: 'otro', status: 'activo', assignedTo: seller._id, createdBy: owner.name,
        pipelineStage: 'cerrado', lastContactDate: day(-1),
        notes: 'Registro ficticio exclusivo de QA; no contactar.'
    });
    const carBase = { year: 2022, km: 35000, fuel: 'Nafta', condition: 'Muy bueno', location: 'Salón Principal', visibleEnWeb: false, color: 'Gris', images: [], expenses: [] };
    const [owned, shared, consigned, sold] = await Car.create([
        { ...carBase, brand: 'Toyota', name: 'Corolla QA propio', price: 18000000, purchasePrice: 14500000, currency: 'ARS', purchaseCurrency: 'ARS', status: 'Disponible', agencyOwned: true, plateOrVin: 'QA-PROPIO', order: 1,
            transmission: 'Automática', bodyType: 'Sedán', doors: 4, engine: '1.8', version: 'QA CVT', color: 'Gris', expenses: [{concept:'Preparación ficticia en otra moneda', amount:300, currency:'USD'}],
            consignmentSeller: seller._id,
            publicEquipment: 'Equipamiento ficticio de QA: ABS, control de estabilidad y cámara de retroceso.',
            publicMaintenance: 'Mantenimiento de demostración informado para revisar el editor. No corresponde a una unidad real.',
            publicPurchaseConditions: 'Condiciones ficticias de QA. Esta unidad no está publicada ni se ofrece a la venta.',
            inspection: {
                mechanic: { status: 'ok', note: 'Evaluación mecánica ficticia registrada en QA.' },
                frontSuspension: { status: 'observacion', note: 'Observación de prueba para revisar el detalle.' },
                brakes: { status: 'ok', note: 'Revisión ficticia sin observaciones.' },
                bodyPaint: { status: 'revisar', note: 'Revisar panel de demostración; no es un diagnóstico real.' },
                interior: { status: 'sin_evaluar', note: '' },
                tiresPercent: 75, service: 'Service informado ficticio a los 30.000 km.', keyCount: 2,
                singleOwner: false, verifiedKm: true, titleInHand: true, vtvValid: null, noDebts: null, transferReady: false,
                documentationNotes: 'Documentación ficticia pendiente de revisión.', generalNotes: 'Peritaje de demostración, sin fotos ni constancias reales.',
                updatedAt: intakeDay(-1), updatedBy: owner.name
            },
            auditLog: [{ action: 'PERITAJE', field: 'inspection', details: 'Peritaje ficticio inicial de la vista previa.', user: owner.name, date: intakeDay(-1), source: 'QA_LOCAL' }],
            images: ['/hero-autosporting.jpg', '/logo-header-white-red.png'], coverImage: '/hero-autosporting.jpg', imagePositions: ['50% 25%', '50% 80%'], imagePosition: '50% 25%' },
        { ...carBase, brand: 'Ford', name: 'Focus QA compartido', price: 15000, purchasePrice: 12000, currency: 'USD', purchaseCurrency: 'USD', status: 'Disponible', agencyOwned: true, plateOrVin: 'QA-COMPARTIDO', investor: { name: 'Inversor de prueba', percentage: 50 }, order: 2,
            purchasePaymentState: { modality: 'ya_pagado_historico', status: 'conciliacion_pendiente', isSharedInvestment: true, partnerCompany: 'Inversor de prueba', partnerPercentage: 50 } },
        { ...carBase, brand: 'Renault', name: 'Sandero QA consignado', price: 11000000, currency: 'ARS', purchaseCurrency: 'ARS', status: 'Disponible', agencyOwned: false, ownerName: 'Consignante de prueba', consignedBy: 'Consignante de prueba', consignmentSeller: seller._id, consignmentStatus: 'publicado', plateOrVin: 'QA-CONSIGNADO', order: 3 },
        { ...carBase, brand: 'Peugeot', name: '208 QA vendido', price: 15000000, purchasePrice: 12000000, currency: 'ARS', purchaseCurrency: 'ARS', status: 'Vendido', sold: true, agencyOwned: true, plateOrVin: 'QA-VENDIDO', order: 4 }
    ]);
    // Casos completos y anónimos de la ficha comercial. Los identificadores
    // alfabéticos y teléfonos en cero son datos de prueba, nunca personas reales.
    const [firstContactClient, followedClient, blockedClient] = await Client.create([
        {
            fullName: 'QA Ficha - Primera atención', phone: '0000000000', email: 'qa-primera@example.invalid', dniCuit: 'QA-SIN-DNI-001',
            type: 'potencial', source: 'web', reason: 'lead_digital', status: 'activo', pipelineStage: 'sin_contactar',
            assignedTo: seller._id, assignedAt: intakeDay(0), createdAt: intakeDay(0), createdBy: owner.name,
            interestedVehicleId: owned._id, vehicleOfInterest: `${owned.brand} ${owned.name}`, brand: owned.brand, model: owned.name,
            description: 'Consulta ficticia por la unidad exacta de stock; busca un sedán automático para uso diario.',
            currency: 'ARS', maxBudget: 19000000, yearFrom: 2020, yearTo: 2024,
            segment: 'regular', gender: 'mujer', birthDate: new Date('1990-02-28T00:00:00.000Z'), occupation: 'Ocupación ficticia de QA',
            purchaseMethod: 'financiacion', purchaseTiming: '1_3_meses', availableDownPayment: 6000000, downPaymentCurrency: 'ARS', tradeInIntent: 'si',
            locality: 'Localidad ficticia QA', province: 'Provincia ficticia QA', nextAction: 'Realizar el primer contacto de demostración',
            nextActionDate: day(0), lastContactDate: null,
            interactions: [{ type: 'llamada', note: 'Intento ficticio sin respuesta; el cliente sigue sin contactar.', outboundNoReply: true, date: intakeDay(0), user: seller.name }],
            clientAuditLog: [{ action: 'CREACION', details: 'Ficha ficticia creada para QA.', date: intakeDay(0), user: owner.name }, { action: 'RESPONSABLE_ASIGNADO', field: 'assignedTo', newValue: String(seller._id), details: 'Responsable ficticio asignado para revisar el historial.', date: intakeDay(0), user: owner.name }],
            notes: 'DATOS FICTICIOS. No contactar: teléfono de ceros y correo reservado .invalid.'
        },
        {
            fullName: 'QA Ficha - Contactado con seguimiento', phone: '0000000001', email: 'qa-seguimiento@example.invalid', dniCuit: 'QA-SIN-DNI-002',
            type: 'potencial', source: 'local', reason: 'entro_puerta', status: 'activo', pipelineStage: 'visita',
            assignedTo: seller._id, assignedAt: intakeDay(-2), createdAt: intakeDay(-2), createdBy: owner.name,
            interestedVehicleId: consigned._id, vehicleOfInterest: `${consigned.brand} ${consigned.name}`, brand: consigned.brand, model: consigned.name,
            description: 'Perfil ficticio que ya respondió y quiere visitar la unidad consignada.', currency: 'ARS', maxBudget: 12000000, yearFrom: 2021, yearTo: 2024,
            segment: 'vip', purchaseMethod: 'contado', purchaseTiming: 'ahora', availableDownPayment: 0, downPaymentCurrency: 'ARS', tradeInIntent: 'no',
            nextAction: 'Coordinar día y horario de la visita ficticia', nextActionDate: day(1), lastContactDate: day(-1),
            interactions: [{ type: 'whatsapp', note: 'Respondió en el caso de demostración y pidió ver la unidad.', outboundNoReply: false, date: intakeDay(-1), user: seller.name }, { type: 'cita_agendada', note: 'Visita ficticia pendiente de confirmación. Agendar no registra una nueva respuesta.', outboundNoReply: false, date: intakeDay(0), user: seller.name }],
            clientAuditLog: [{ action: 'CREACION', details: 'Ficha de demostración con contacto y próximo paso.', date: intakeDay(-2), user: owner.name }, { action: 'INTERACCION', field: 'interactions', details: 'Respuesta ficticia guardada; etapa de visita.', date: intakeDay(-1), user: seller.name }],
            notes: 'DATOS FICTICIOS de QA; no corresponde a una persona real.'
        },
        {
            fullName: 'QA Ficha - No contactar', email: 'qa-sin-contacto@example.invalid', phone: '0000000002',
            type: 'potencial', source: 'facebook', reason: 'lead_digital', status: 'activo', pipelineStage: 'contactado', doNotContact: true,
            assignedTo: seller._id, createdAt: intakeDay(-3), createdBy: owner.name,
            description: 'Caso ficticio para comprobar accesos de contacto deshabilitados.',
            clientAuditLog: [{ action: 'ACTUALIZACION', field: 'doNotContact', oldValue: false, newValue: true, details: 'Preferencia ficticia de no recibir contactos.', date: intakeDay(0), user: owner.name }],
            notes: 'Registro ficticio de QA con preferencia No contactar activa.'
        }
    ]);
    const matchingRequest = await Pedido.create({
        clientId: firstContactClient._id, clientName: firstContactClient.fullName, clientPhone: firstContactClient.phone,
        requestedBrand: owned.brand, requestedModel: owned.name, yearRange: '2020-2024', budget: 19000000, currency: 'ARS', status: 'Buscando',
        assignedTo: seller._id, createdBy: owner._id, nextActionDate: day(1),
        notes: 'Pedido manual ficticio de QA. No activa el aviso de la ficha ni envía mensajes.'
    });
    const [vehicleFollowUp] = await CrmTask.create([
        { title: 'QA - Revisar documentación del Corolla', description: 'Seguimiento ficticio del vehículo para revisar ficha y agenda.', type: 'general', source: 'stock', status: 'pendiente', vehicleId: owned._id, dueDate: day(1), assignedTo: seller._id, responsibleText: 'Gestoría ficticia', user: owner.name, auditLog: [{ action: 'SEGUIMIENTO_CREADO', user: owner.name, date: intakeDay(0) }] },
        { title: 'QA - Confirmar visita del cliente', description: followedClient.nextAction, type: 'lead', source: 'agenda', status: 'pendiente', clientId: followedClient._id, vehicleId: consigned._id, dueDate: day(1), dueTime: '10:00', assignedTo: seller._id, user: seller.name }
    ]);
    await CommunicationLog.create([
        { entityType: 'vehicle', entityId: owned._id, vehicleId: owned._id, clientId: firstContactClient._id, vehicleActivityType: 'consulta', createdBy: seller._id, assignedTo: seller._id, channel: 'web', direction: 'inbound', outcome: 'interested', title: 'QA - Consulta por Corolla', notes: 'Consulta ficticia vinculada a un cliente real del seed; no se envió ningún mensaje.', contactDate: intakeDay(0), sourceModule: 'stock' },
        { entityType: 'vehicle', entityId: consigned._id, vehicleId: consigned._id, clientId: followedClient._id, vehicleActivityType: 'oferta', createdBy: seller._id, assignedTo: seller._id, channel: 'in_person', direction: 'internal', outcome: 'interested', title: 'QA - Oferta informada', notes: 'Oferta ficticia para revisar la actividad comercial de una unidad consignada.', contactDate: intakeDay(-1), sourceModule: 'stock' },
        { entityType: 'client', entityId: followedClient._id, clientId: followedClient._id, vehicleId: consigned._id, vehicleActivityType: 'visita', createdBy: seller._id, assignedTo: seller._id, channel: 'phone', direction: 'internal', outcome: 'requested_visit', title: 'QA - Próxima visita', notes: 'Nota ficticia para comprobar conversación e historial del cliente y del vehículo.', contactDate: intakeDay(0), nextActionDate: day(1), sourceModule: 'clientes' }
    ]);
    // Más de una página para comprobar filtros y totales sobre el conjunto
    // completo. Las variantes de marca y moneda son intencionales y anónimas.
    const extraStock = await Car.create(Array.from({ length: 28 }, (_, index) => {
        const currency = ['USD', 'U$S', 'ARS', '$'][index % 4];
        const dollars = ['USD', 'U$S'].includes(currency);
        const oldDays = [5, 90, 91, 120][index % 4];
        const isFord = index % 4 !== 3;
        return {
            ...carBase,
            brand: isFord ? ['Ford', ' FORD ', 'ford'][index % 3] : 'Toyota',
            name: isFord ? 'Focus' : 'Etios', year: 2018 + index % 7,
            km: index % 7 === 0 ? 0 : 10000 + index * 3500,
            transmission: index % 2 === 0 ? 'Manual' : 'Automática', bodyType: 'Hatchback', doors: 5,
            price: index === 26 ? 0 : (dollars ? 9000 + index * 500 : 10000000 + index * 250000),
            currency, purchaseCurrency: dollars ? 'USD' : 'ARS',
            status: index % 11 === 0 ? 'Pausado' : 'Disponible',
            agencyOwned: true, plateOrVin: `QA-ETAPA2-${String(index + 1).padStart(2, '0')}`,
            order: index + 10, createdAt: new Date(day(-oldDays).getTime() + 3 * 3600000),
            publishedOnML: index % 3 === 0 ? 'No' : 'Si',
            images: index % 3 === 0 ? [] : ['/hero-autosporting.jpg'],
            notes: 'Unidad ficticia de QA para filtros y paginación; no es una publicación comercial.'
        };
    }));
    const stages = ['sin_contactar', 'contactado', 'con_pedido', 'visita', 'negociacion', 'cerrado', 'perdido'];
    const extraClients = await Client.create(Array.from({ length: 27 }, (_, index) => ({
        fullName: `QA Comercial ${String(index + 1).padStart(2, '0')}`,
        email: `qa-comercial-${index + 1}@example.invalid`, type: index % 5 === 0 ? 'vendedor' : 'potencial',
        source: index % 2 === 0 ? 'local' : 'web', status: index === 24 ? 'inactivo' : 'activo',
        assignedTo: index % 2 === 0 ? seller._id : owner._id,
        pipelineStage: stages[index % stages.length],
        nextAction: index % 4 === 3 ? '' : 'Revisar consulta ficticia en QA',
        nextActionDate: index % 4 === 3 ? null : day([-2, 0, 5][index % 3]),
        lastContactDate: index % 7 === 0 ? null : day(-3),
        brand: 'Ford', model: 'Focus', currency: 'USD', maxBudget: 15000 + index * 100,
        yearFrom: 2018, yearTo: 2024, description: 'Busca un sedán de demostración.',
        createdAt: day(-index), createdBy: owner.name,
        notes: 'Registro ficticio de QA. No contactar; no contiene datos de una persona real.'
    })));
    const activeSale = await Sale.create({
        vehicleId: sold._id, clientId: client._id, salePrice: 15000000, saleCurrency: 'ARS',
        status: 'confirmada', saleDate: day(-7), paymentMethod: 'financiado', salesperson: seller.name,
        installmentsCount: 3, createdBy: owner.name, documentationStatus: 'pendiente', expedienteStatus: 'en_proceso',
        financingDetails: { hasFinancing: true, financedBalance: 15000000, totalFinancedWithInterest: 15000000, installmentsCount: 3, installmentAmount: 5000000, lastInstallmentAmount: 5000000, totalOperationPrice: 15000000, downPayment: 0 },
        commissionSettings: { mode: 'fixed', extraAmount: 0, extraCurrency: 'ARS' }, notes: 'Venta ficticia para revisar cuotas y caja.'
    });
    const legacyTradeIn = await Car.create({
        ...carBase, brand: 'Volkswagen', name: 'Permuta QA legado', plateOrVin: 'QA-PERMUTA-LEGADO',
        price: 11000, currency: 'USD', purchasePrice: 0, purchaseCurrency: 'USD',
        status: 'Disponible', agencyOwned: false, images: [], coverImage: '/hero-autosporting.jpg',
        transmission: 'Manual', color: 'Gris', order: 5,
        tradeInOrigin: { saleId: activeSale._id, value: 7000, currency: 'USD', source: 'sale_flow' },
        notes: 'Caso ficticio: portada sin galería y costo de toma distinto del campo de compra legacy.'
    });
    const draft = await Sale.create({
        status: 'borrador', salePrice: 0, saleCurrency: 'USD', createdBy: owner.name,
        draftData: { buyerName: 'Consulta de prueba', notes: 'Borrador de QA sin vehículo ni efectos de caja.' },
        notes: 'Continuar este borrador para verificar recuperación del formulario.'
    });
    const [partial, rescheduled, overdue] = await Installment.create([
        { saleId: activeSale._id, clientId: client._id, vehicleId: sold._id, installmentNumber: 1, dueDate: day(2), amount: 5000000, paidAmount: 1250000, currency: 'ARS', status: 'parcial', concept: 'Cuota parcial de prueba' },
        { saleId: activeSale._id, clientId: client._id, vehicleId: sold._id, installmentNumber: 2, dueDate: day(-4), originalDueDate: day(-4), isRescheduled: true, rescheduledDate: day(12), amount: 5000000, paidAmount: 0, currency: 'ARS', status: 'reprogramada', concept: 'Cuota reprogramada de prueba' },
        { saleId: activeSale._id, clientId: client._id, vehicleId: sold._id, installmentNumber: 3, dueDate: day(-2), amount: 5000000, paidAmount: 0, currency: 'ARS', status: 'vencida', concept: 'Cuota vencida de prueba' }
    ]);
    await Transaction.create([
        { type: 'Ingreso', amount: 7250000, currency: 'ARS', category: 'Saldo Inicial', description: 'Saldo inicial ficticio ARS', accountId: ars._id, status: 'activo', date: day(-10), createdBy: owner.name },
        { type: 'Ingreso', amount: 12000, currency: 'USD', category: 'Saldo Inicial', description: 'Saldo inicial ficticio USD', accountId: usd._id, status: 'activo', date: day(-10), createdBy: owner.name },
        { type: 'Ingreso', amount: 1250000, currency: 'ARS', category: 'Cobro de cuota', description: 'Cobro parcial ficticio', concept: 'Cobro parcial de prueba', accountId: ars._id, installmentId: partial._id, saleId: activeSale._id, vehicleId: sold._id, clientId: client._id, source: 'cuota', status: 'activo', date: day(-1), createdBy: owner.name },
        { type: 'Egreso', amount: 250000, currency: 'ARS', category: 'Mantenimiento', description: 'Egreso pendiente de prueba con vencimiento', accountId: ars._id, status: 'pendiente', date: day(0), dueDate: day(3), createdBy: owner.name },
        { type: 'Egreso', amount: 50000, currency: 'ARS', category: 'Gastos', description: 'Egreso de prueba sin fecha de vencimiento', accountId: ars._id, status: 'pendiente', date: day(0), createdBy: owner.name }
    ]);
    await CrmSettings.create({ agencyName: 'AutoSporting QA aislada', commercialEmail: OWNER_EMAIL, cockpitMonthlyTargetUSD: 10000, assistantConfig: { enabled: false }, infoAutoConfig: { enabled: false }, dailySummary: { enabled: false }, updatedBy: owner._id });

    if (process.env.CRM_PARITY_DEV === '1') process.env.NODE_ENV = 'development';
    const next = (await import('next')).default;
    nextApp = next({ dev: process.env.CRM_PARITY_DEV === '1', dir: ROOT, hostname: HOST, port: FRONTEND_PORT });
    await nextApp.prepare();
    const handleNext = nextApp.getRequestHandler();
    const nextApiPrefixes = ['/api/admin/pedidos', '/api/admin/infracciones', '/api/admin/telefonos', '/api-gestoria'];
    frontendServer = http.createServer((req, res) => {
        const pathname = new URL(req.url || '/', `http://${HOST}:${FRONTEND_PORT}`).pathname;
        const nextOwned = nextApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
        if (pathname.startsWith('/api/') && !nextOwned) return app(req, res);
        Promise.resolve(handleNext(req, res)).catch((error) => {
            console.error('[QA AISLADA] Error de Next:', error.message);
            if (!res.headersSent) { res.statusCode = 500; res.end('Error en vista previa aislada'); }
        });
    });
    apiServer = http.createServer(app);
    await listen(apiServer, API_PORT);
    await listen(frontendServer, FRONTEND_PORT);
    console.log('\n[QA AISLADA LISTA] Solo datos ficticios; proveedores externos deshabilitados.');
    console.log(`CRM: http://${HOST}:${FRONTEND_PORT}/admin`);
    console.log(`API local: http://${HOST}:${API_PORT}`);
    console.log(`Owner ficticio: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
    console.log(`Ventas ficticio: ${SELLER_EMAIL} / ${SELLER_PASSWORD}`);
    console.log(`Consulta ficticia de solo lectura: ${READER_EMAIL} / ${READER_PASSWORD}`);
    console.log(`Fixture IDs: ${JSON.stringify({ owned: String(owned._id), shared: String(shared._id), consigned: String(consigned._id), sold: String(sold._id), legacyTradeIn: String(legacyTradeIn._id), activeSale: String(activeSale._id), draft: String(draft._id), partial: String(partial._id), rescheduled: String(rescheduled._id), overdue: String(overdue._id) })}`);
    console.log(`Etapa 2: ${extraStock.length} unidades y ${extraClients.length} fichas comerciales ficticias adicionales para revisar segunda página y filtros.`);
    console.log(`QA fichas comerciales: ${JSON.stringify({ firstContactClient: String(firstContactClient._id), followedClient: String(followedClient._id), blockedClient: String(blockedClient._id), matchingRequest: String(matchingRequest._id), vehicleFollowUp: String(vehicleFollowUp._id) })}`);
    console.log('Ctrl+C cierra los servidores y elimina la réplica temporal.\n');
}

startPreview().catch(async (error) => {
    console.error('[QA AISLADA] No se pudo iniciar:', error.message);
    await shutdown(1);
});
