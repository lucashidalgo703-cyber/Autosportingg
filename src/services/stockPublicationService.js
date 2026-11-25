import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Car from '../models/Car.js';
import { canManageStockMedia, canPublishStock, hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isActiveStock } from '../utils/inventoryStock.js';
import { resolveCarImageUpdate } from '../utils/carImageOrder.js';
import { publicCatalogQuery, PUBLIC_CATALOG_SORT } from '../utils/catalogVisibility.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const fields = '_id brand name model version year plateOrVin status sold price currency km fuel condition transmission color images coverImage imagePosition imagePositions visibleEnWeb createdAt order';
const owns = (body, key) => Object.prototype.hasOwnProperty.call(body, key);
const active = car => !car.sold && isActiveStock(car);
const readAccess = user => { if (!canManageStockMedia(user) && !canPublishStock(user)) fail('No tenés permiso para gestionar fotos o catálogo.', 403); };
export const stockPublicationDto = (car, user) => ({ ...car, id: String(car._id), visibleEnWeb: car.visibleEnWeb !== false,
    canManageImages: canManageStockMedia(user), canPublish: canPublishStock(user) });

export async function getStockPublicationCar(user, id, { imageEdit = false } = {}) {
    readAccess(user);
    if (!mongoose.isValidObjectId(id)) fail('Vehículo no encontrado.', 404);
    const car = await Car.findById(id).select(fields).lean();
    if (!car) fail('Vehículo no encontrado.', 404);
    // Existing inventory editors can still maintain historical gallery photos.
    if (!active(car) && !(imageEdit && hasPermission(user, PERMISSIONS.STOCK_WRITE))) fail('La unidad ya no forma parte del stock activo. Actualizá la lista.', 409);
    return car;
}

export async function getStockPublication(user, query = {}) {
    readAccess(user);
    const positive = (value, fallback, max) => {
        if (value === undefined || value === '') return fallback;
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < 1 || number > max) fail('La página o el límite no es válido.');
        return number;
    };
    const page = positive(query.page, 1, 100000), limit = positive(query.limit, 20, 100);
    if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 160)) fail('La búsqueda no es válida.');
    const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    const words = normalize(query.search).split(/\s+/).filter(Boolean);
    const cars = (await Car.find({ sold: { $ne: true } }).select(fields).sort({ order: 1, createdAt: -1 }).lean())
        .filter(active).filter(car => words.every(word => normalize([car.brand, car.name, car.model, car.plateOrVin, car.year].join(' ')).includes(word)));
    return { items: cars.slice((page - 1) * limit, page * limit).map(car => stockPublicationDto(car, user)), total: cars.length,
        pages: Math.ceil(cars.length / limit), page, limit };
}

const validBody = (body, keys) => {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key))) fail('Esta acción solo permite modificar fotos o la visibilidad del catálogo.');
};
function framing(body) {
    const values = {};
    const position = value => typeof value === 'string' && value.length <= 50
        && /^(?:(?:left|center|right|top|bottom)|(?:100|\d{1,2})(?:\.\d+)?%\s+(?:100|\d{1,2})(?:\.\d+)?%)$/.test(value.trim());
    if (owns(body, 'imagePosition')) {
        if (!position(body.imagePosition)) fail('El encuadre de la imagen no es válido.');
        values.imagePosition = body.imagePosition.trim();
    }
    if (owns(body, 'imagePositions')) {
        let positions = body.imagePositions;
        if (typeof positions === 'string') { try { positions = JSON.parse(positions); } catch { fail('Los encuadres no son válidos.'); } }
        if (!Array.isArray(positions) || positions.length > 20 || !positions.every(position)) fail('Los encuadres no son válidos.');
        values.imagePositions = positions.map(value => value.trim());
        if (values.imagePositions[0]) values.imagePosition = values.imagePositions[0];
    }
    return values;
}
async function savePresentation(user, car, changes, field, details) {
    if (!Object.keys(changes).length) fail('No hay cambios para guardar.');
    const actor = String(user.email || user.username || user.name || user.role).slice(0, 160);
    // Compare operational fields so a concurrent sale cannot be reactivated here.
    const guard = { _id: car._id, status: car.status, sold: car.sold === undefined ? { $ne: true } : car.sold };
    if (field === 'images') {
        guard.images = car.images === undefined ? { $exists: false } : car.images;
        guard.imagePositions = car.imagePositions === undefined ? { $exists: false } : car.imagePositions;
    }
    const saved = await Car.findOneAndUpdate(guard, {
        $set: changes, $push: { auditLog: { action: 'EDICION', field, oldValue: Object.fromEntries(Object.keys(changes).map(key => [key, car[key]])),
            newValue: changes, user: actor, source: 'CRM_V2', details, date: new Date() } }
    }, { new: true, runValidators: true }).select(fields).lean();
    if (!saved) fail('La unidad cambió mientras guardabas. Actualizá y volvé a intentar.', 409);
    return stockPublicationDto(saved, user);
}
export async function updateStockImages(user, id, body = {}, files = [], loadedCar = null) {
    if (!canManageStockMedia(user)) fail('No tenés permiso para modificar fotos.', 403);
    validBody(body, ['imageOrder', 'imagePositions', 'imagePosition']);
    const car = loadedCar || await getStockPublicationCar(user, id, { imageEdit: true });
    const imageUpdate = resolveCarImageUpdate({ body, files, existingImages: car.images || [], existingCoverImage: car.coverImage || '', cloudName: process.env.CLOUDINARY_CLOUD_NAME || '' });
    if (imageUpdate.error) fail(imageUpdate.error);
    const changes = framing(body);
    if (imageUpdate.provided) { changes.images = imageUpdate.images; changes.coverImage = imageUpdate.coverImage; }
    const saved = await savePresentation(user, car, changes, 'images', 'Fotos y encuadres actualizados desde Stock.');
    return { success: true, images: saved.images || [], uploadedImages: files.map(file => file.path), imagePosition: saved.imagePosition, imagePositions: saved.imagePositions || [] };
}
export async function updateStockPublication(user, id, body = {}) {
    if (!canPublishStock(user)) fail('No tenés permiso para modificar el catálogo.', 403);
    validBody(body, ['visibleEnWeb']);
    if (typeof body.visibleEnWeb !== 'boolean') fail('Elegí si el vehículo se muestra en el catálogo.');
    const car = await getStockPublicationCar(user, id);
    return savePresentation(user, car, { visibleEnWeb: body.visibleEnWeb }, 'visibleEnWeb', body.visibleEnWeb ? 'Visibilidad del catálogo activada; se conserva el estado operativo.' : 'Vehículo ocultado del catálogo.');
}


const orderAccess = user => { if (!canPublishStock(user)) fail('No tenés permiso para ordenar el catálogo.', 403); };
const catalogRevision = cars => createHash('sha256').update(JSON.stringify(cars.map(car => [
    String(car._id), car.order ?? null, car.createdAt ?? null, car.status ?? null,
    car.visibleEnWeb ?? null, car.sold ?? null
]))).digest('hex');
const catalogSnapshot = (cars, user) => ({
    items: cars.map((car, index) => ({ ...stockPublicationDto(car, user), position: index + 1 })),
    revision: catalogRevision(cars), canReorder: true
});
const orderedPublishedCars = session => {
    const query = Car.find(publicCatalogQuery()).select(fields).sort(PUBLIC_CATALOG_SORT);
    return (session ? query.session(session) : query).lean();
};

export async function getCatalogOrder(user) {
    orderAccess(user);
    return catalogSnapshot(await orderedPublishedCars(), user);
}

export async function updateCatalogOrder(user, body = {}) {
    orderAccess(user);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['vehicleIds', 'expectedRevision'].includes(key))) {
        fail('Esta acción solo permite guardar el orden del catálogo.');
    }
    const { vehicleIds, expectedRevision } = body;
    if (!Array.isArray(vehicleIds) || vehicleIds.length > 10000
        || vehicleIds.some(id => typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id))
        || new Set(vehicleIds.map(id => id.toLowerCase())).size !== vehicleIds.length) {
        fail('El orden debe incluir cada vehículo una sola vez y con un identificador válido.');
    }
    if (typeof expectedRevision !== 'string' || !/^[a-f0-9]{64}$/.test(expectedRevision)) {
        fail('Actualizá la lista antes de guardar el orden.');
    }
    const requestedIds = vehicleIds.map(id => id.toLowerCase());
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const current = await orderedPublishedCars(session);
            if (catalogRevision(current) !== expectedRevision) {
                fail('El catálogo cambió mientras lo ordenabas. Actualizá la lista y revisá el orden antes de guardarlo.', 409);
            }
            const byId = new Map(current.map(car => [String(car._id), car]));
            if (requestedIds.length !== current.length || requestedIds.some(id => !byId.has(id))) {
                fail('El orden debe incluir exactamente los vehículos publicados de la lista actual.');
            }
            const actor = String(user.email || user.username || user.name || user.role).slice(0, 160);
            const operations = requestedIds.map((id, index) => {
                const car = byId.get(id), position = index + 1;
                // Every save writes the entire catalogue, including unchanged
                // positions. The audit write creates a common transaction write
                // set, so disjoint swaps cannot both commit the same snapshot.
                return { updateOne: {
                    filter: { _id: car._id, order: car.order === undefined ? { $exists: false } : car.order },
                    update: { $set: { order: position }, $push: { auditLog: {
                        action: 'EDICION', field: 'order', oldValue: car.order ?? null, newValue: position,
                        user: actor, source: 'CRM_V2', date: new Date(), details: 'Orden del catálogo actualizado. Posición: ' + position
                    } } }
                } };
            });
            if (operations.length) {
                const changed = await Car.bulkWrite(operations, { session, ordered: true });
                if (changed.matchedCount !== operations.length) {
                    fail('Otro usuario modificó el orden. Actualizá la lista para revisar los cambios.', 409);
                }
            }
            result = catalogSnapshot(requestedIds.map((id, index) => ({ ...byId.get(id), order: index + 1 })), user);
        });
        return result;
    } finally {
        await session.endSession();
    }
}
