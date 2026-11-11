import mongoose from 'mongoose';
import Client from '../models/Client.js';
import AdminUser from '../models/AdminUser.js';
import Car from '../models/Car.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { CLIENT_PIPELINE_STAGES, CLIENT_STAGE_ALIASES, clientCalendarKey, clientTodayKey, effectiveClientContactedExpression, clientContactCalendarExpression } from '../utils/clientCommercial.js';

const STAGES = CLIENT_PIPELINE_STAGES.map(stage => stage.id);
const TEXT_FIELDS = {
    firstName: 150, lastName: 150, fullName: 300, phone: 100, email: 320, dniCuit: 100,
    locality: 200, province: 200, address: 500, notes: 20000, vehicleOfInterest: 500,
    description: 2000, brand: 200, model: 200, nextAction: 500, occupation: 300
};
const ENUM_FIELDS = {
    type: ['comprador', 'vendedor', 'ambos', 'potencial'],
    source: ['web', 'whatsapp', 'instagram', 'facebook', 'referido', 'local', 'mercadolibre', 'otro'],
    status: ['activo', 'inactivo', 'bloqueado'], reason: ['lead_digital', 'entro_puerta'], currency: ['ARS', 'USD'],
    segment: ['regular', 'vip'], gender: ['', 'mujer', 'hombre'],
    purchaseMethod: ['', 'contado', 'financiacion'], purchaseTiming: ['', 'ahora', '1_3_meses', 'mas_adelante', 'explorando'],
    downPaymentCurrency: ['ARS', 'USD', null], tradeInIntent: ['', 'si', 'no']
};

export class ClientInputError extends Error {
    constructor(message) { super(message); this.statusCode = 400; }
}

export async function normalizeClientCommercialInput(payload, current = null) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ClientInputError('Los datos del cliente no son válidos.');
    const values = {};
    if (Object.hasOwn(payload, 'contactConfirmed')) {
        if (payload.contactConfirmed !== null && typeof payload.contactConfirmed !== 'boolean') throw new ClientInputError('El estado de contacto no es válido.');
        values.contactConfirmed = payload.contactConfirmed;
    }
    if (Object.hasOwn(payload, 'doNotContact')) {
        if (typeof payload.doNotContact !== 'boolean') throw new ClientInputError('La preferencia de contacto no es válida.');
        values.doNotContact = payload.doNotContact;
    }
    for (const [key, limit] of Object.entries(TEXT_FIELDS)) {
        if (!Object.hasOwn(payload, key)) continue;
        if (typeof payload[key] !== 'string' || payload[key].length > limit) throw new ClientInputError(`Revisá el campo ${key}.`);
        values[key] = payload[key].trim();
    }
    if (!Object.hasOwn(payload, 'fullName') && (Object.hasOwn(values, 'firstName') || Object.hasOwn(values, 'lastName'))) {
        values.fullName = `${values.firstName ?? current?.firstName ?? ''} ${values.lastName ?? current?.lastName ?? ''}`.trim();
    }
    for (const [key, options] of Object.entries(ENUM_FIELDS)) {
        if (!Object.hasOwn(payload, key)) continue;
        if (!options.includes(payload[key])) throw new ClientInputError(`Revisá el campo ${key}.`);
        values[key] = payload[key];
    }
    if (Object.hasOwn(payload, 'pipelineStage')) {
        const stage = CLIENT_STAGE_ALIASES[payload.pipelineStage] || payload.pipelineStage;
        if (!STAGES.includes(stage)) throw new ClientInputError('Elegí una etapa comercial válida.');
        values.pipelineStage = stage;
    }
    for (const key of ['maxBudget', 'yearFrom', 'yearTo', 'availableDownPayment']) {
        if (!Object.hasOwn(payload, key)) continue;
        const raw = payload[key];
        const value = raw === null || (typeof raw === 'string' && raw.trim() === '') ? null : (typeof raw === 'number' || typeof raw === 'string') ? Number(raw) : NaN;
        if (value !== null && (!Number.isFinite(value) || value < 0 || (['yearFrom', 'yearTo'].includes(key) && (!Number.isInteger(value) || value < 1000 || value > 9999)))) {
            throw new ClientInputError(`Revisá el campo ${key}.`);
        }
        values[key] = value;
    }
    const yearFrom = Object.hasOwn(values, 'yearFrom') ? values.yearFrom : current?.yearFrom;
    const yearTo = Object.hasOwn(values, 'yearTo') ? values.yearTo : current?.yearTo;
    if (yearFrom != null && yearTo != null && yearFrom > yearTo) throw new ClientInputError('El año desde no puede superar al año hasta.');
    const downPayment = Object.hasOwn(values, 'availableDownPayment') ? values.availableDownPayment : current?.availableDownPayment;
    const downCurrency = Object.hasOwn(values, 'downPaymentCurrency') ? values.downPaymentCurrency : current?.downPaymentCurrency;
    if (downPayment != null && !downCurrency) throw new ClientInputError('Elegí la moneda del dinero disponible para entregar.');
    for (const key of ['lastContactDate', 'nextActionDate', 'birthDate', 'createdAt']) {
        if (!Object.hasOwn(payload, key)) continue;
        if (payload[key] === null || payload[key] === '') {
            if (key !== 'createdAt') values[key] = null;
        }
        else {
            const date = clientCalendarKey(payload[key]);
            if (!date) throw new ClientInputError(`Revisá la fecha ${key}.`);
            if (key === 'birthDate' && date > clientTodayKey()) throw new ClientInputError('La fecha de nacimiento no puede ser futura.');
            if (key === 'createdAt' && current?.createdAt && date === clientCalendarKey(current.createdAt)) continue;
            values[key] = new Date(`${date}T${key === 'createdAt' ? '03' : '00'}:00:00.000Z`);
        }
    }
    if (Object.hasOwn(payload, 'interestedVehicleId')) {
        const value = payload.interestedVehicleId || null;
        if (value !== null && (typeof value !== 'string' || !mongoose.isValidObjectId(value))) throw new ClientInputError('Elegí un vehículo válido del stock.');
        if (value) {
            const car = await Car.findById(value).select('brand name plateOrVin').lean();
            if (!car) throw new ClientInputError('El vehículo de interés ya no está disponible en el registro.');
            values.vehicleOfInterest = `${car.brand || ''} ${car.name || ''}${car.plateOrVin ? ` · ${car.plateOrVin}` : ''}`.trim();
        }
        values.interestedVehicleId = value;
    }
    if (Object.hasOwn(payload, 'tags')) {
        if (!Array.isArray(payload.tags) || payload.tags.length > 50 || payload.tags.some(tag => typeof tag !== 'string' || tag.length > 100)) throw new ClientInputError('Revisá las etiquetas.');
        values.tags = payload.tags.map(tag => tag.trim());
    }
    if (Object.hasOwn(payload, 'assignedTo')) {
        const assignedTo = payload.assignedTo === '' ? null : payload.assignedTo;
        if (assignedTo !== null && !mongoose.isValidObjectId(assignedTo)) throw new ClientInputError('El vendedor asignado no es válido.');
        if (assignedTo && String(assignedTo) !== String(current?.assignedTo || '')) {
            if (!await AdminUser.exists({ _id: assignedTo, active: true })) throw new ClientInputError('Elegí un vendedor activo del equipo.');
        }
        values.assignedTo = assignedTo;
    }
    return values;
}

const regexLiteral = value => new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const activeCommercial = { $and: [ { $eq: [{ $ifNull: ['$status', 'activo'] }, 'activo'] }, { $ne: ['$doNotContact', true] }, { $not: [{ $in: ['$_commercialStage', ['cerrado', 'perdido']] }] } ] };
const firstAttention = { $and: [activeCommercial, { $eq: ['$_contacted', false] }] };
const countWhen = condition => ({ $sum: { $cond: [condition, 1, 0] } });

export async function listCommercialClients(filters = {}, actor = {}) {
    const page = filters.page === undefined ? 1 : Number(filters.page);
    const limit = filters.limit === undefined ? 50 : Number(filters.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new ClientInputError('La página o el límite de clientes no es válido.');
    const attention = filters.attention || 'todos';
    if (!['todos', 'hoy', 'primera', 'sinfecha'].includes(attention)) throw new ClientInputError('El filtro de atención no es válido.');
    if (filters.segment && !['mis-clientes', 'vendieron', 'compraron', 'contactados', 'sin-contactar'].includes(filters.segment)) throw new ClientInputError('El segmento de clientes no es válido.');
    const query = {};
    for (const key of ['type', 'source', 'status', 'gender']) {
        if (!filters[key]) continue;
        if (!ENUM_FIELDS[key].includes(filters[key])) throw new ClientInputError(`El filtro ${key} no es válido.`);
        query[key] = filters[key];
    }
    if (filters.tier) {
        if (!ENUM_FIELDS.segment.includes(filters.tier)) throw new ClientInputError('La categoría del cliente no es válida.');
        query.segment = filters.tier;
    }
    for (const key of ['createdFrom', 'createdTo']) {
        if (!filters[key]) continue;
        const date = clientCalendarKey(filters[key]);
        if (!date) throw new ClientInputError('El período de ingreso no es válido.');
        query.createdAt ||= {};
        if (key === 'createdFrom') query.createdAt.$gte = new Date(`${date}T03:00:00.000Z`);
        else query.createdAt.$lt = new Date(Date.parse(`${date}T03:00:00.000Z`) + 86400000);
    }
    if (filters.followups === 'pending') query.nextActionDate = { $ne: null };
    if (filters.search) {
        if (typeof filters.search !== 'string' || filters.search.length > 300) throw new ClientInputError('La búsqueda es demasiado larga.');
        const regex = regexLiteral(filters.search);
        query.$or = ['fullName', 'phoneNormalized', 'emailNormalized', 'locality', 'dniCuit', 'brand', 'model', 'description', 'vehicleOfInterest', 'nextAction'].map(key => ({ [key]: regex }));
    }
    const owner = filters.segment === 'mis-clientes' ? actor.id || actor.userId : filters.assignedTo;
    if (owner) {
        if (!mongoose.isValidObjectId(owner)) throw new ClientInputError('El responsable no es válido.');
        query.assignedTo = new mongoose.Types.ObjectId(owner);
    } else if (filters.segment === 'mis-clientes') throw new ClientInputError('No se pudo identificar al usuario de la sesión.');
    if (filters.segment === 'vendieron') query.type = { $in: ['vendedor', 'ambos'] };
    const pipeline = [{ $match: query }];
    if (filters.segment === 'compraron') {
        pipeline.push({ $lookup: { from: 'sales', localField: '_id', foreignField: 'clientId', as: '_relatedSales' } });
        pipeline.push({ $match: { _relatedSales: { $elemMatch: { status: { $nin: ['cancelada', 'borrador'] } } } } });
    }
    pipeline.push({ $set: { _contacted: effectiveClientContactedExpression(), _contactKey: clientContactCalendarExpression(), _commercialStage: { $switch: {
        branches: Object.entries(CLIENT_STAGE_ALIASES).map(([alias, stage]) => ({ case: { $eq: ['$pipelineStage', alias] }, then: stage })),
        default: { $cond: [{ $eq: [{ $ifNull: ['$pipelineStage', ''] }, ''] }, 'sin_contactar', '$pipelineStage'] }
    } } } });
    if (['contactados', 'sin-contactar'].includes(filters.segment)) pipeline.push({ $match: { _contacted: filters.segment === 'contactados' } });
    if (filters.followups === 'pending') pipeline.push({ $match: { $expr: activeCommercial } });
    const today = new Date(`${clientTodayKey()}T00:00:00.000Z`);
    const endToday = new Date(today.getTime() + 86400000);
    const priorities = {
        primera: firstAttention,
        hoy: { $and: [activeCommercial, { $or: [firstAttention, { $and: [{ $eq: [{ $type: '$nextActionDate' }, 'date'] }, { $lt: ['$nextActionDate', endToday] }] }] }] },
        sinfecha: { $and: [activeCommercial, { $eq: ['$_contacted', true] }, { $eq: [{ $ifNull: ['$nextActionDate', null] }, null] }] }
    };
    const resultFilter = attention === 'todos' ? [] : [{ $match: { $expr: priorities[attention] } }];
    const sortKey = String(filters.sort || 'priority').replace(/_desc$/, '');
    const direction = String(filters.sort || '').endsWith('_desc') ? -1 : 1;
    const sorts = { name: { fullName: direction, _id: 1 }, recent: { createdAt: -1, _id: 1 }, segment: { segment: direction, fullName: 1, _id: 1 }, source: { source: direction, fullName: 1, _id: 1 }, assigned: { _assignedName: direction, fullName: 1, _id: 1 }, lastContact: { lastContactDate: direction, _id: 1 } };
    if (sortKey === 'assigned') pipeline.push({ $lookup: { from: 'adminusers', localField: 'assignedTo', foreignField: '_id', pipeline: [{ $project: { name: 1 } }], as: '_assignedUser' } }, { $set: { _assignedName: { $ifNull: [{ $arrayElemAt: ['$_assignedUser.name', 0] }, ''] } } });
    const operationCount = hasPermission(actor, PERMISSIONS.VENTAS_READ) ? [
        { $lookup: { from: 'sales', let: { client: '$_id' }, pipeline: [{ $match: { $expr: { $eq: ['$clientId', '$$client'] }, status: { $nin: ['cancelada', 'borrador'] } } }, { $count: 'total' }], as: '_clientOperations' } },
        { $set: { operationsCount: { $ifNull: [{ $arrayElemAt: ['$_clientOperations.total', 0] }, 0] } } }
    ] : [];
    const month = clientTodayKey().slice(0, 7), [yearNumber, monthNumber] = month.split('-').map(Number);
    const previousMonth = new Date(Date.UTC(yearNumber, monthNumber - 2, 1)).toISOString().slice(0, 7);
    const nextMonth = new Date(Date.UTC(yearNumber, monthNumber, 1)).toISOString().slice(0, 7);
    const [result] = await Client.aggregate([...pipeline, { $facet: {
        priorityCounts: [{ $group: { _id: null, todos: { $sum: 1 }, hoy: countWhen(priorities.hoy), primera: countWhen(priorities.primera), sinfecha: countWhen(priorities.sinfecha) } }],
        summary: [...resultFilter, { $group: { _id: null, total: { $sum: 1 }, activos: countWhen({ $eq: ['$status', 'activo'] }), compradores: countWhen({ $in: ['$type', ['comprador', 'ambos']] }), potenciales: countWhen({ $eq: ['$type', 'potencial'] }) } }],
        pipelineCounts: [...resultFilter, { $group: { _id: '$_commercialStage', total: { $sum: 1 } } }],
        contactCounts: [{ $group: { _id: null, total: countWhen('$_contacted'), thisMonth: countWhen({ $and: ['$_contacted', { $gte: ['$_contactKey', `${month}-01`] }, { $lt: ['$_contactKey', `${nextMonth}-01`] }] }), lastMonth: countWhen({ $and: ['$_contacted', { $gte: ['$_contactKey', `${previousMonth}-01`] }, { $lt: ['$_contactKey', `${month}-01`] }] }), withoutDate: countWhen({ $and: ['$_contacted', { $eq: ['$_contactKey', null] }] }) } }],
        contactMonths: [{ $match: { _contacted: true } }, { $group: { _id: { $ifNull: [{ $substrBytes: ['$_contactKey', 0, 7] }, 'sin_fecha'] }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }],
        clients: [...resultFilter, { $sort: sorts[sortKey] || { nextActionDate: 1, createdAt: -1, _id: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, ...operationCount, { $project: { _relatedLeads: 0, _relatedSales: 0, _commercialStage: 0, _contacted: 0, _contactKey: 0, _assignedUser: 0, _assignedName: 0, _clientOperations: 0 } }]
    } }]);
    const clients = await Client.populate(result.clients, { path: 'assignedTo', select: 'name email role' });
    const summary = result.summary[0] || { total: 0, activos: 0, compradores: 0, potenciales: 0 };
    const priorityCounts = result.priorityCounts[0] || { todos: 0, hoy: 0, primera: 0, sinfecha: 0 };
    delete summary._id; delete priorityCounts._id;
    const contactCounts = result.contactCounts[0] || { total: 0, thisMonth: 0, lastMonth: 0, withoutDate: 0 };
    delete contactCounts._id;
    return { clients, total: summary.total, pages: Math.ceil(summary.total / limit), page, limit, summary, priorityCounts, contactCounts, contactMonths: result.contactMonths.map(item => ({ key: item._id || 'sin_fecha', count: item.count })), pipelineCounts: Object.fromEntries(result.pipelineCounts.map(item => [item._id, item.total])) };
}
