import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import VehicleInvoice, { VehicleInvoiceIdentity, VehicleInvoiceRequest, VehicleInvoiceFile } from '../models/VehicleInvoice.js';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import { canReadVehicleInvoices, canWriteVehicleInvoices } from '../utils/adminPermissions.js';
import { stockCurrency } from '../utils/inventoryStock.js';
import { logAudit } from '../utils/auditLogger.js';
import { inspectPortalUpload, verifyPrivateFileStaff } from './buyerPortalFileService.js';
import { encryptBuyerPortalBuffer, decryptBuyerPortalBuffer, buyerPortalSigningKey } from './buyerPortalService.js';

const idOf = value => String(value?._id || value || '');
const validId = value => /^[a-f\d]{24}$/i.test(idOf(value));
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const actor = user => idOf(user.id || user.userId || user._id);
const clean = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const canonical = value => clean(value).normalize('NFKC').replace(/\s+/g, ' ').toLocaleUpperCase('es');
const authorize = (user, write = false) => {
    if (!(write ? canWriteVehicleInvoices(user) : canReadVehicleInvoices(user))) fail('No tenés acceso a Facturación / ARCA.', 403);
};
const positiveRevision = value => { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) fail('Actualizá la factura antes de guardar.'); return n; };
const day = (value, optional = false) => {
    if (optional && !value) return '';
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Revisá la fecha del comprobante.');
    const date = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('Revisá la fecha del comprobante.');
    return value;
};
const digits = (value, width, label) => {
    const str = String(value ?? '').trim();
    if (!new RegExp('^\\d{1,' + width + '}$').test(str)) fail(`Revisá ${label}.`);
    return str.padStart(width, '0');
};
function metadata(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisá los datos de la factura.');
    const invoiceType = clean(input.invoiceType, 8);
    if (!['A', 'B', 'C', 'M', 'E', 'otro'].includes(invoiceType)) fail('Elegí el tipo de factura.');
    const rawAmount = input.totalAmount;
    if (!['string', 'number'].includes(typeof rawAmount) || !/^\d+(?:\.\d{1,2})?$/.test(String(rawAmount))
        || !Number.isFinite(Number(rawAmount)) || Number(rawAmount) <= 0 || Number(rawAmount) > 1e12) fail('Ingresá un importe total válido, mayor a cero y con hasta dos decimales.');
    if (!['ARS', 'USD'].includes(input.currency)) fail('Elegí ARS o USD para la factura.');
    const partyName = clean(input.partyName, 250);
    if (!partyName) fail('Completá el nombre del comprador o proveedor.');
    const partyTaxId = clean(input.partyTaxId, 30).replace(/[\s.-]/g, '');
    if (partyTaxId && !/^\d{6,13}$/.test(partyTaxId)) fail('Revisá el CUIT / DNI.');
    return { invoiceType, pointOfSale: digits(input.pointOfSale, 5, 'el punto de venta'),
        invoiceNumber: digits(input.invoiceNumber, 8, 'el número de factura'), invoiceDate: day(input.invoiceDate),
        totalAmount: Math.round(Number(rawAmount) * 100) / 100, currency: input.currency, partyName, partyTaxId,
        authorizationCode: clean(input.authorizationCode, 40), authorizationDueDate: day(input.authorizationDueDate, true),
        notes: clean(input.notes, 5000) };
}
const identityOf = data => hash(['vehicle-invoice-identity:v1', data.direction,
    data.direction === 'sale' ? 'autosporting' : data.partyTaxId || canonical(data.partyName),
    data.invoiceType, data.pointOfSale, data.invoiceNumber]);
const vehicleOf = car => ({ brand: car?.brand || '', name: car?.name || car?.model || '', year: car?.year || null, plate: car?.plateOrVin || '' });
const pageOf = input => ({ page: Math.max(1, Math.min(10000, Number.parseInt(input.page, 10) || 1)),
    limit: Math.max(1, Math.min(50, Number.parseInt(input.limit, 10) || 20)) });
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let prepared;
async function ensureCollections() {
    return prepared ||= Promise.all([VehicleInvoice, VehicleInvoiceIdentity, VehicleInvoiceRequest, VehicleInvoiceFile].map(model => model.createCollection()))
        .catch(error => { prepared = null; throw error; });
}
async function dto(doc) {
    const [car, file] = await Promise.all([Car.findById(doc.carId).select('brand name model year plateOrVin').lean(),
        doc.fileId ? VehicleInvoiceFile.findById(doc.fileId).select('version fileName mimeType byteLength createdAt').lean() : null]);
    const result = {};
    for (const key of ['direction', 'partyName', 'partyTaxId', 'invoiceType', 'pointOfSale', 'invoiceNumber', 'invoiceDate',
        'totalAmount', 'currency', 'authorizationCode', 'authorizationDueDate', 'notes', 'status', 'annulmentReason',
        'annulledAt', 'revision', 'createdAt', 'updatedAt']) if (doc[key] !== undefined) result[key] = doc[key];
    return { ...result, id: idOf(doc), _id: idOf(doc), carId: idOf(doc.carId), saleId: doc.saleId ? idOf(doc.saleId) : null,
        vehicle: car ? vehicleOf(car) : doc.vehicleSnapshot, file: file ? { id: idOf(file), version: file.version,
            fileName: file.fileName, mimeType: file.mimeType, byteLength: file.byteLength, size: file.byteLength, uploadedAt: file.createdAt } : null };
}
async function operation(direction, input, session = null) {
    if (!['sale', 'purchase'].includes(direction) || !validId(input.carId)) fail('Seleccioná una operación y un vehículo válidos.');
    const car = await Car.findById(input.carId).session(session).lean();
    if (!car) fail('El vehículo ya no está disponible en el CRM.', 404);
    if (direction === 'sale') {
        if (!validId(input.saleId)) fail('Seleccioná la venta vinculada.');
        const sale = await Sale.findOne({ _id: input.saleId, status: { $nin: ['cancelada', 'borrador'] } }).session(session).lean();
        if (!sale || idOf(sale.vehicleId) !== idOf(car)) fail('El vehículo no corresponde a esa venta activa.', 409);
        return { car, sale };
    }
    if (input.saleId) fail('Una factura de compra se vincula a la unidad adquirida.');
    return { car, sale: null };
}
async function mutation(user, kind, key, fingerprint, req, work) {
    authorize(user, true);
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(String(key || ''))) fail('No pudimos identificar el envío. Volvé a abrir el formulario.');
    await ensureCollections();
    const requestId = hash(['vehicle-invoice-request:v1', actor(user), kind, key]);
    const session = await mongoose.startSession(); let invoiceId, duplicate = false;
    try {
        await session.withTransaction(async () => {
            const previous = await VehicleInvoiceRequest.findById(requestId).session(session).lean();
            if (previous) {
                if (previous.fingerprint !== fingerprint) fail('Este envío ya fue recibido con otros datos. Revisá la factura.', 409);
                invoiceId = previous.invoiceId; duplicate = true; return;
            }
            invoiceId = await work(session);
            await VehicleInvoiceRequest.create([{ _id: requestId, fingerprint, invoiceId }], { session });
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } catch (error) {
        if (error.code === 11000) {
            const previous = await VehicleInvoiceRequest.findById(requestId).lean();
            if (previous?.fingerprint === fingerprint) { invoiceId = previous.invoiceId; duplicate = true; }
            else fail('La factura ya está registrada o cambió mientras la editabas. Actualizá la lista.', 409);
        } else if (error.code === 20 || error.codeName === 'IllegalOperation') {
            fail('La base debe admitir transacciones para registrar la factura de forma segura.', 503);
        } else throw error;
    } finally { await session.endSession(); }
    return { invoice: await dto(await VehicleInvoice.findById(invoiceId).lean()), ...(duplicate ? { duplicate: true } : {}) };
}
export async function listVehicleInvoices(user, input = {}) {
    authorize(user);
    const query = {}, { page, limit } = pageOf(input);
    if (input.direction) { if (!['sale', 'purchase'].includes(input.direction)) fail('Tipo de operación no válido.'); query.direction = input.direction; }
    if (input.status) { if (!['active', 'annulled'].includes(input.status)) fail('Estado no válido.'); query.status = input.status; }
    const search = clean(input.search, 100);
    if (search) {
        const regex = new RegExp(escaped(search), 'i');
        const carIds = await Car.find({ $or: [{ brand: regex }, { name: regex }, { plateOrVin: regex }] }).distinct('_id');
        query.$or = [{ partyName: regex }, { partyTaxId: regex }, { invoiceNumber: regex }, { carId: { $in: carIds } },
            { 'vehicleSnapshot.brand': regex }, { 'vehicleSnapshot.name': regex }, { 'vehicleSnapshot.plate': regex }];
    }
    const [docs, total] = await Promise.all([VehicleInvoice.find(query).sort({ invoiceDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), VehicleInvoice.countDocuments(query)]);
    return { items: await Promise.all(docs.map(dto)), total, pages: Math.max(1, Math.ceil(total / limit)), page };
}
export async function invoiceOperations(user, input = {}) {
    authorize(user);
    const direction = input.direction || 'sale';
    if (!['sale', 'purchase'].includes(direction)) fail('Elegí ventas o compras.');
    const { page, limit } = pageOf(input), search = clean(input.search, 100), regex = search ? new RegExp(escaped(search), 'i') : null;
    if (direction === 'purchase') {
        const query = regex ? { $or: [{ brand: regex }, { name: regex }, { plateOrVin: regex }, { ownerName: regex }] } : {};
        const [cars, total] = await Promise.all([Car.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Car.countDocuments(query)]);
        const ids = cars.map(car => car.clientId).filter(Boolean), clients = await Client.find({ _id: { $in: ids } }).select('firstName lastName fullName dniCuit').lean();
        const map = new Map(clients.map(client => [idOf(client), client]));
        return { items: cars.map(car => { const client = map.get(idOf(car.clientId)); return { direction, carId: idOf(car), saleId: null,
            vehicle: vehicleOf(car), party: { name: client?.fullName || car.ownerName || car.consignedBy || '', taxId: client?.dniCuit || '' },
            operationDate: car.createdAt, amount: car.purchasePrice ?? null, currency: stockCurrency(car.purchaseCurrency) || null }; }), total, pages: Math.max(1, Math.ceil(total / limit)), page };
    }
    const query = { status: { $nin: ['cancelada', 'borrador'] } };
    if (regex) {
        const [carIds, clientIds] = await Promise.all([Car.find({ $or: [{ brand: regex }, { name: regex }, { plateOrVin: regex }] }).distinct('_id'), Client.find({ fullName: regex }).distinct('_id')]);
        query.$or = [{ vehicleId: { $in: carIds } }, { clientId: { $in: clientIds } }, { buyerName: regex }];
    }
    const [sales, total] = await Promise.all([Sale.find(query).populate('vehicleId', 'brand name model year plateOrVin').populate('clientId', 'firstName lastName fullName dniCuit')
        .sort({ saleDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Sale.countDocuments(query)]);
    return { items: sales.filter(sale => sale.vehicleId?._id).map(sale => ({ direction, saleId: idOf(sale), carId: idOf(sale.vehicleId), vehicle: vehicleOf(sale.vehicleId),
        party: { name: sale.clientId?.fullName || sale.buyerName || '', taxId: sale.clientId?.dniCuit || sale.buyerDni || '' },
        operationDate: sale.saleDate || sale.createdAt, amount: sale.salePrice ?? sale.totalAmount ?? null, currency: stockCurrency(sale.saleCurrency) || null })), total, pages: Math.max(1, Math.ceil(total / limit)), page };
}
export async function registerVehicleInvoice(user, input, key, req) {
    authorize(user, true);
    const data = metadata(input), direction = input.direction;
    const relation = { carId: idOf(input.carId), saleId: input.saleId ? idOf(input.saleId) : null };
    return mutation(user, 'create', key, hash({ direction, ...relation, ...data }), req, async session => {
        const { car, sale } = await operation(direction, relation, session);
        const id = new mongoose.Types.ObjectId(), identityKey = identityOf({ direction, ...data });
        await VehicleInvoiceIdentity.create([{ _id: identityKey, invoiceId: id }], { session });
        await VehicleInvoice.create([{ _id: id, direction, carId: car._id, ...(sale ? { saleId: sale._id } : {}),
            vehicleSnapshot: vehicleOf(car), ...data, identityKey, createdBy: actor(user), revision: 1,
            history: [{ action: 'registered', at: new Date(), by: actor(user) }] }], { session });
        await logAudit({ req, action: 'FACTURA_REGISTRADA', module: 'facturacion', entityType: 'VehicleInvoice', entityId: id,
            metadata: { direction, carId: idOf(car), saleId: sale ? idOf(sale) : null }, strict: true, session });
        return id;
    });
}
export async function editVehicleInvoice(user, id, input, key, req) {
    authorize(user, true);
    if (!validId(id)) fail('Factura no encontrada.', 404);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisá los datos de la factura.');
    const revision = positiveRevision(input.revision);
    const allowed = ['revision', 'status', 'reason', 'invoiceType', 'pointOfSale', 'invoiceNumber', 'invoiceDate', 'totalAmount', 'currency', 'partyName', 'partyTaxId', 'authorizationCode', 'authorizationDueDate', 'notes'];
    if (Object.keys(input).some(field => !allowed.includes(field))) fail('La operación y el vehículo de una factura no pueden modificarse.');
    const changes = Object.fromEntries(allowed.filter(field => Object.hasOwn(input, field)).map(field => [field, input[field]]));
    return mutation(user, 'edit:' + id, key, hash(changes), req, async session => {
        const doc = await VehicleInvoice.findById(id).select('+identityKey').session(session);
        if (!doc) fail('Factura no encontrada.', 404);
        if (doc.status !== 'active') fail('Este registro está anulado.', 409);
        if (doc.revision !== revision) fail('La factura cambió. Actualizá la lista antes de guardar.', 409);
        if (input.status === 'annulled') {
            const reason = clean(input.reason, 2000);
            if (!reason) fail('Indicá el motivo de la anulación del registro.');
            doc.status = 'annulled'; doc.annulmentReason = reason; doc.annulledAt = new Date(); doc.annulledBy = actor(user);
        } else {
            if (input.status && input.status !== 'active') fail('Estado no válido.');
            const updated = metadata({ ...doc.toObject(), ...input }), identityKey = identityOf({ direction: doc.direction, ...updated });
            if (identityKey !== doc.identityKey) {
                await VehicleInvoiceIdentity.create([{ _id: identityKey, invoiceId: doc._id }], { session });
                await VehicleInvoiceIdentity.deleteOne({ _id: doc.identityKey, invoiceId: doc._id }, { session });
                doc.identityKey = identityKey;
            }
            Object.assign(doc, updated);
        }
        doc.revision++; doc.updatedBy = actor(user);
        doc.history.push({ action: doc.status === 'annulled' ? 'annulled' : 'edited', at: new Date(), by: actor(user), changes });
        await doc.save({ session });
        await logAudit({ req, action: doc.status === 'annulled' ? 'FACTURA_REGISTRO_ANULADO' : 'FACTURA_EDITADA', module: 'facturacion',
            entityType: 'VehicleInvoice', entityId: doc._id, metadata: { revision: doc.revision }, strict: true, session });
        return doc._id;
    });
}
export async function uploadVehicleInvoiceFile(user, id, input, file, key, req) {
    authorize(user, true);
    if (!validId(id)) fail('Factura no encontrada.', 404);
    const revision = positiveRevision(input.revision);
    let inspected;
    try { inspected = inspectPortalUpload(file); }
    catch (error) {
        if (error.status === 400) fail('Subí un PDF o una imagen JPG, PNG o WebP válida.');
        throw error;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(inspected.mimeType)) fail('Subí un PDF o una imagen JPG, PNG o WebP.');
    const fileName = clean(file.originalname || 'factura', 180).replace(/[\x00-\x1f\x7f/\\"']/g, '_');
    return mutation(user, 'file:' + id, key, hash({ revision, fileHash: inspected.fileHash, fileName }), req, async session => {
        const doc = await VehicleInvoice.findById(id).session(session);
        if (!doc) fail('Factura no encontrada.', 404);
        if (doc.status !== 'active' || doc.revision !== revision) fail('La factura cambió o fue anulada. Actualizá la lista antes de cargar.', 409);
        const oldFile = doc.fileId ? await VehicleInvoiceFile.findById(doc.fileId).select('version').session(session).lean() : null;
        const fileId = new mongoose.Types.ObjectId();
        await VehicleInvoiceFile.create([{ _id: fileId, invoiceId: doc._id, version: (oldFile?.version || 0) + 1, fileName, ...inspected,
            encryptedFile: encryptBuyerPortalBuffer(file.buffer, `vehicle-invoice-file:${id}:${fileId}`), uploadedBy: actor(user) }], { session });
        doc.fileId = fileId; doc.revision++; doc.updatedBy = actor(user);
        doc.history.push({ action: oldFile ? 'file_replaced' : 'file_uploaded', at: new Date(), by: actor(user), changes: { fileId, version: (oldFile?.version || 0) + 1 } });
        await doc.save({ session });
        await logAudit({ req, action: 'FACTURA_ARCHIVO_CARGADO', module: 'facturacion', entityType: 'VehicleInvoice', entityId: doc._id,
            metadata: { fileId: idOf(fileId), revision: doc.revision }, strict: true, session });
        return doc._id;
    });
}
export async function vehicleInvoiceFileAccess(user, invoiceId, download = false) {
    authorize(user);
    if (!validId(invoiceId) || !user.sid) fail('Archivo no disponible.', 404);
    const doc = await VehicleInvoice.findOne({ _id: invoiceId, status: 'active' }).lean();
    if (!doc?.fileId) fail('No hay un archivo disponible para este registro.', 404);
    const sessionId = crypto.createHash('sha256').update(user.sid).digest('hex'), userId = actor(user);
    authorize(await verifyPrivateFileStaff({ sessionId, userId }));
    const exp = Math.floor(Date.now() / 1000) + 120;
    const access = jwt.sign({ purpose: 'vehicle-invoice-file', invoiceId, fileId: idOf(doc.fileId), sessionId, userId, download: download === true, exp },
        buyerPortalSigningKey(), { algorithm: 'HS256', audience: 'autosporting-vehicle-invoice-file' });
    return { url: `/api/vehicle-invoice-files/${doc.fileId}?access=${access}`, expiresAt: new Date(exp * 1000) };
}
export async function readVehicleInvoiceFile(id, access) {
    let claims;
    try { claims = jwt.verify(access || '', buyerPortalSigningKey(), { algorithms: ['HS256'], audience: 'autosporting-vehicle-invoice-file' }); }
    catch { fail('El acceso al archivo venció. Volvé a abrirlo desde Facturación.', 401); }
    if (!validId(id) || claims.purpose !== 'vehicle-invoice-file' || claims.fileId !== id || !validId(claims.invoiceId)) fail('Archivo no disponible.', 404);
    authorize(await verifyPrivateFileStaff(claims));
    const doc = await VehicleInvoice.findOne({ _id: claims.invoiceId, fileId: id, status: 'active' }).lean();
    if (!doc) fail('El archivo fue reemplazado o el registro fue anulado.', 404);
    const file = await VehicleInvoiceFile.findOne({ _id: id, invoiceId: doc._id }).select('+encryptedFile').lean();
    if (!file) fail('Archivo no disponible.', 404);
    return { buffer: decryptBuyerPortalBuffer(file.encryptedFile, `vehicle-invoice-file:${doc._id}:${id}`), mimeType: file.mimeType, fileName: file.fileName, download: claims.download === true };
}
