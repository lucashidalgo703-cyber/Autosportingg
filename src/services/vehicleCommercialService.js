import Car from '../models/Car.js';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import Pedido from '../models/Pedido.js';
import AdminUser from '../models/AdminUser.js';
import CrmTask from '../models/CrmTask.js';
import CommunicationLog from '../models/CommunicationLog.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { VehicleCommercialError, invalid, commercialText, commercialDate, inspectionInput, deduplicateVehiclePeople, normalizedCommercialLabel } from '../utils/vehicleCommercial.js';

const can = (actor, permission) => ['owner', 'admin'].includes(actor?.role) || hasPermission(actor, permission);
const actorName = actor => actor?.username || actor?.name || actor?.email || actor?.role || 'CRM_V2';
const validId = (value, field) => {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) invalid(field, 'El identificador no es válido.');
    return value;
};
const versionFilter = doc => doc.__v === undefined ? { __v: { $exists: false } } : { __v: doc.__v };
const conflict = () => { throw new VehicleCommercialError('El registro cambió mientras editabas. Actualizá la ficha antes de volver a guardar.', {}, 409); };
const absent = label => { throw new VehicleCommercialError(`${label} no encontrado.`, {}, 404); };
const requiredObject = payload => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) invalid('_form', 'Los datos no son válidos.');
};
export async function requireCommercialCar(id) {
    validId(id, 'vehicleId');
    const car = await Car.findById(id).lean();
    if (!car) absent('Vehículo');
    return car;
}
export async function readVehicleInspection(id) {
    const car = await requireCommercialCar(id);
    return { inspection: car.inspection || null };
}
export async function updateVehicleInspection(id, payload, actor) {
    const values = inspectionInput(payload);
    const car = await requireCommercialCar(id);
    const updatedAt = new Date();
    const set = { 'inspection.updatedAt': updatedAt, 'inspection.updatedBy': actorName(actor), updatedAt };
    for (const [key, value] of Object.entries(values)) {
        if (value && typeof value === 'object') for (const [field, nested] of Object.entries(value)) set[`inspection.${key}.${field}`] = nested;
        else set[`inspection.${key}`] = value;
    }
    const saved = await Car.findOneAndUpdate({ _id: id, ...versionFilter(car) }, {
        $set: set, $inc: { __v: 1 },
        $push: { auditLog: { action: 'PERITAJE', field: 'inspection', oldValue: car.inspection || null, newValue: values, date: updatedAt, user: actorName(actor), source: 'CRM_STOCK' } }
    }, { new: true, runValidators: true }).select('inspection').lean();
    if (!saved) conflict();
    return { inspection: saved.inspection };
}

export function vehicleCommercialPermissions(actor) {
    return {
        consultationsAllowed: can(actor, PERMISSIONS.COMMUNICATIONLOGS_READ),
        clientsAllowed: can(actor, PERMISSIONS.CLIENTES_READ),
        matchingAllowed: can(actor, PERMISSIONS.CLIENTES_READ) && can(actor, PERMISSIONS.PEDIDOS_READ),
        agendaAllowed: can(actor, PERMISSIONS.AGENDA_READ),
        salesAllowed: can(actor, PERMISSIONS.VENTAS_READ),
        reservationsAllowed: can(actor, PERMISSIONS.RESERVAS_READ),
        leadsAllowed: can(actor, PERMISSIONS.LEADS_READ),
        canWrite: can(actor, PERMISSIONS.STOCK_WRITE),
        canWriteActivity: can(actor, PERMISSIONS.STOCK_WRITE) && can(actor, PERMISSIONS.COMMUNICATIONLOGS_WRITE),
        canWriteFollowUp: can(actor, PERMISSIONS.STOCK_WRITE) && can(actor, PERMISSIONS.AGENDA_WRITE)
    };
}
function communicationScope(actor) {
    const restricted = actor?.role === 'ventas' || (!['owner', 'admin'].includes(actor?.role) && !can(actor, PERMISSIONS.EQUIPO_READ));
    return restricted ? { $or: [{ assignedTo: actor.id || actor.userId }, { createdBy: actor.id || actor.userId }] } : {};
}
const clientFields = 'fullName phone dniCuit brand model currency maxBudget yearFrom yearTo description pipelineStage status';
const clientPerson = client => ({ _id: client._id, clientId: client._id, fullName: client.fullName, phone: client.phone || '', dniCuit: client.dniCuit || '', source: 'client' });
const activeSale = { status: { $nin: ['borrador', 'cancelada'] }, historicalOnly: { $ne: true } };
const operational = doc => doc ? { _id: doc._id, status: doc.status, clientId: doc.clientId || null, leadId: doc.leadId || null } : null;
const currency = value => ['ARS', '$'].includes(value) ? 'ARS' : ['USD', 'U$S', 'US$'].includes(value) ? 'USD' : '';
function demandMatches(car, demand) {
    if (normalizedCommercialLabel(demand.brand) !== normalizedCommercialLabel(car.brand) || normalizedCommercialLabel(demand.model) !== normalizedCommercialLabel(car.name)) return false;
    if (demand.yearFrom != null && car.year < demand.yearFrom || demand.yearTo != null && car.year > demand.yearTo) return false;
    if (demand.maxBudget > 0 && (currency(car.currency) !== currency(demand.currency) || car.price > demand.maxBudget)) return false;
    return true;
}
function vehicleMatches(car, clientDemands, pedidos) {
    const matches = clientDemands.filter(demand => demandMatches(car, demand)).map(demand => ({ ...demand, source: 'client', matchReason: 'Marca y modelo exactos; año y presupuesto cuando están informados.' }));
    for (const pedido of pedidos) {
        const range = String(pedido.yearRange || '').trim();
        const match = /^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/.exec(range);
        if (range && !match) continue;
        const demand = { brand: pedido.requestedBrand, model: pedido.requestedModel, yearFrom: match ? Number(match[1]) : null, yearTo: match ? Number(match[2] || match[1]) : null, maxBudget: pedido.budget, currency: pedido.currency };
        if (demandMatches(car, demand)) matches.push({ _id: pedido._id, clientId: pedido.clientId, fullName: pedido.clientName, phone: pedido.clientPhone, ...demand, description: pedido.notes, status: pedido.status, source: 'pedido', matchReason: 'Marca y modelo exactos; año y presupuesto cuando están informados.' });
    }
    return matches;
}
function activityView(log, clientsAllowed) {
    return {
        _id: log._id, activity: log.vehicleActivityType || null, title: log.title,
        channel: log.channel, occurredAt: log.contactDate, contactDate: log.contactDate,
        notes: log.notes, createdBy: log.createdBy, createdAt: log.createdAt,
        ...(clientsAllowed ? { clientId: log.clientId || null, contactName: log.vehicleContact?.name || '', contactPhone: log.vehicleContact?.phone || '', contactDni: log.vehicleContact?.dni || '' } : {})
    };
}
export async function getVehicleCommercialContext(id, actor) {
    const car = await requireCommercialCar(id);
    const permissions = vehicleCommercialPermissions(actor);
    const [logs, tasks, leads, sales, reservations, pedidos, clientDemands] = await Promise.all([
        permissions.consultationsAllowed ? CommunicationLog.find({ $and: [{ isDeleted: { $ne: true } }, { $or: [{ vehicleId: id }, { entityType: 'vehicle', entityId: id }] }, communicationScope(actor)] }).sort({ contactDate: -1, createdAt: -1 }).populate('createdBy', 'name').lean() : [],
        permissions.agendaAllowed ? CrmTask.find({ vehicleId: id }).sort({ dueDate: 1, _id: 1 }).populate('assignedTo', 'name').lean() : [],
        permissions.clientsAllowed && permissions.leadsAllowed ? Lead.find({ vehicleId: id }).select('name phone clientId').lean() : [],
        permissions.salesAllowed ? Sale.find({ vehicleId: id, ...activeSale }).select('status clientId leadId').sort({ createdAt: -1 }).lean() : [],
        permissions.reservationsAllowed ? Reservation.find({ vehicleId: id, status: 'activa' }).select('status clientId leadId').sort({ createdAt: -1 }).lean() : [],
        permissions.matchingAllowed ? Pedido.find({ status: { $in: ['Pendiente', 'Buscando'] } }).select('clientId clientName clientPhone requestedBrand requestedModel yearRange budget currency notes status').lean() : [],
        permissions.clientsAllowed ? Client.find({ status: 'activo', pipelineStage: { $nin: ['cerrado', 'perdido', 'sin_interes'] }, brand: { $exists: true, $ne: '' }, model: { $exists: true, $ne: '' } }).select(clientFields).lean() : []
    ]);
    const clientIds = permissions.clientsAllowed ? [...new Set([...leads, ...logs, ...sales, ...reservations].map(item => item.clientId).filter(Boolean).map(String))] : [];
    const clients = clientIds.length ? await Client.find({ _id: { $in: clientIds } }).select(clientFields).lean() : [];
    const people = permissions.clientsAllowed ? deduplicateVehiclePeople([
        ...clients.map(clientPerson),
        ...leads.map(lead => ({ leadId: lead._id, clientId: lead.clientId, fullName: lead.name, phone: lead.phone, source: 'lead' })),
        ...logs.map(log => ({ clientId: log.clientId, leadId: log.leadId, fullName: log.vehicleContact?.name || '', phone: log.vehicleContact?.phone || '', dniCuit: log.vehicleContact?.dni || '', source: 'contact' }))
    ]) : [];
    const matchingRequests = permissions.clientsAllowed ? vehicleMatches(car, clientDemands, pedidos) : [];
    const activities = logs.map(log => activityView(log, permissions.clientsAllowed));
    const pendingActions = tasks.filter(task => task.status === 'pendiente');
    return {
        permissions,
        summary: {
            consultations: permissions.consultationsAllowed ? logs.filter(log => log.vehicleActivityType === 'consulta').length : null,
            offers: permissions.consultationsAllowed ? logs.filter(log => log.vehicleActivityType === 'oferta').length : null,
            visits: permissions.consultationsAllowed ? logs.filter(log => log.vehicleActivityType === 'visita').length : null,
            interestedPeople: permissions.clientsAllowed ? people.length : null,
            unidentifiedContacts: permissions.clientsAllowed && permissions.consultationsAllowed ? logs.filter(log => !log.clientId && !log.leadId && !/\d/.test(log.vehicleContact?.phone || '') && !log.vehicleContact?.dni).length : null,
            matchingRequests: permissions.clientsAllowed ? matchingRequests.length : null,
            pendingActions: permissions.agendaAllowed ? pendingActions.length : null
        },
        status: { sale: operational(sales[0]), reservation: operational(reservations[0]) },
        consultations: activities.filter(log => log.activity === 'consulta'), activities,
        interestedClients: people, matchingRequests,
        workPlan: { nextTask: pendingActions[0] || null, pendingActions },
        history: activities
    };
}

// One query per collection for the whole visible page, never one context request per row.
export async function getVehicleCommercialSummaries(rawIds, actor) {
    if (typeof rawIds !== 'string') invalid('ids', 'Indicá los identificadores de las unidades.');
    const ids = [...new Set(rawIds.split(',').map(value => value.trim()).filter(Boolean))];
    if (!ids.length || ids.length > 50) invalid('ids', 'Consultá entre 1 y 50 unidades por vez.');
    for (const id of ids) validId(id, 'ids');
    const permissions = vehicleCommercialPermissions(actor);
    const [cars, logs, tasks, leads, sales, reservations, pedidos] = await Promise.all([
        Car.find({ _id: { $in: ids } }).select('brand name year price currency').lean(),
        permissions.consultationsAllowed ? CommunicationLog.find({ $and: [{ isDeleted: { $ne: true } }, { $or: [{ vehicleId: { $in: ids } }, { entityType: 'vehicle', entityId: { $in: ids } }] }, communicationScope(actor)] }).select('vehicleId entityId clientId leadId vehicleActivityType vehicleContact').lean() : [],
        permissions.agendaAllowed ? CrmTask.find({ vehicleId: { $in: ids }, status: 'pendiente' }).select('vehicleId').lean() : [],
        permissions.clientsAllowed && permissions.leadsAllowed ? Lead.find({ vehicleId: { $in: ids } }).select('vehicleId clientId name phone').lean() : [],
        permissions.clientsAllowed && permissions.salesAllowed ? Sale.find({ vehicleId: { $in: ids }, ...activeSale }).select('vehicleId clientId').lean() : [],
        permissions.clientsAllowed && permissions.reservationsAllowed ? Reservation.find({ vehicleId: { $in: ids }, status: 'activa' }).select('vehicleId clientId').lean() : [],
        permissions.matchingAllowed ? Pedido.find({ status: { $in: ['Pendiente', 'Buscando'] } }).select('requestedBrand requestedModel yearRange budget currency').lean() : []
    ]);
    const clientIds = [...new Set([...logs, ...leads, ...sales, ...reservations].map(item => item.clientId).filter(Boolean).map(String))];
    const clients = permissions.clientsAllowed ? await Client.find({ $or: [
        { _id: { $in: clientIds } },
        { status: 'activo', pipelineStage: { $nin: ['cerrado', 'perdido', 'sin_interes'] }, brand: { $exists: true, $ne: '' }, model: { $exists: true, $ne: '' } }
    ] }).select(clientFields).lean() : [];
    const clientDemands = clients.filter(client => client.status === 'activo' && !['cerrado', 'perdido', 'sin_interes'].includes(client.pipelineStage) && client.brand && client.model);
    const summaries = {};
    for (const car of cars) {
        const key = String(car._id);
        const carLogs = logs.filter(log => String(log.vehicleId || log.entityId) === key);
        const carLeads = leads.filter(lead => String(lead.vehicleId) === key);
        const relatedIds = new Set([...carLogs, ...carLeads, ...sales.filter(sale => String(sale.vehicleId) === key), ...reservations.filter(reservation => String(reservation.vehicleId) === key)].map(item => String(item.clientId || '')));
        const people = permissions.clientsAllowed ? deduplicateVehiclePeople([
            ...clients.filter(client => relatedIds.has(String(client._id))).map(clientPerson),
            ...carLeads.map(lead => ({ leadId: lead._id, clientId: lead.clientId, fullName: lead.name, phone: lead.phone, source: 'lead' })),
            ...carLogs.map(log => ({ clientId: log.clientId, leadId: log.leadId, fullName: log.vehicleContact?.name || '', phone: log.vehicleContact?.phone || '', dniCuit: log.vehicleContact?.dni || '', source: 'contact' }))
        ]) : [];
        summaries[key] = {
            consultations: permissions.consultationsAllowed ? carLogs.filter(log => log.vehicleActivityType === 'consulta').length : null,
            offers: permissions.consultationsAllowed ? carLogs.filter(log => log.vehicleActivityType === 'oferta').length : null,
            visits: permissions.consultationsAllowed ? carLogs.filter(log => log.vehicleActivityType === 'visita').length : null,
            interestedPeople: permissions.clientsAllowed ? people.length : null,
            unidentifiedContacts: permissions.clientsAllowed && permissions.consultationsAllowed ? carLogs.filter(log => !log.clientId && !log.leadId && !/\d/.test(log.vehicleContact?.phone || '') && !log.vehicleContact?.dni).length : null,
            matchingRequests: permissions.clientsAllowed ? vehicleMatches(car, clientDemands, pedidos).length : null,
            pendingActions: permissions.agendaAllowed ? tasks.filter(task => String(task.vehicleId) === key).length : null
        };
    }
    return { summaries, permissions, notFoundIds: ids.filter(id => !Object.hasOwn(summaries, id)) };
}

export async function createVehicleActivity(id, payload, actor) {
    requiredObject(payload); await requireCommercialCar(id);
    if (!['consulta', 'oferta', 'visita'].includes(payload.activity)) invalid('activity', 'Elegí consulta, oferta o visita.');
    const channel = { llamada: 'phone', otro: 'other', presencial: 'in_person' }[payload.channel] || payload.channel;
    if (!['whatsapp', 'phone', 'email', 'in_person', 'instagram', 'facebook', 'web', 'internal_note', 'other'].includes(channel)) invalid('channel', 'Elegí un canal válido.');
    const contactDate = commercialDate(payload.occurredAt, 'occurredAt');
    const notes = commercialText(payload.notes ?? '', 'notes', 5000);
    const contact = { name: commercialText(payload.contactName ?? '', 'contactName', 300), phone: commercialText(payload.contactPhone ?? '', 'contactPhone', 100), dni: commercialText(payload.contactDni ?? '', 'contactDni', 100) };
    let clientId = null;
    if (payload.clientId) {
        if (!can(actor, PERMISSIONS.CLIENTES_READ)) throw new VehicleCommercialError('Sin permiso para vincular clientes.', {}, 403);
        clientId = validId(payload.clientId, 'clientId');
        if (!await Client.exists({ _id: clientId })) invalid('clientId', 'El cliente ya no está disponible.');
    }
    if (!clientId && !contact.name && !contact.phone && !contact.dni) invalid('contactName', 'Seleccioná un cliente o identificá el contacto.');
    const userId = validId(actor?.id || actor?.userId, '_session');
    const log = await CommunicationLog.create({
        entityType: 'vehicle', entityId: id, vehicleId: id, clientId,
        createdBy: userId, assignedTo: userId, channel, direction: 'internal',
        title: { consulta: 'Consulta por vehículo', oferta: 'Oferta por vehículo', visita: 'Visita por vehículo' }[payload.activity],
        vehicleActivityType: payload.activity, vehicleContact: contact, notes, contactDate,
        outcome: payload.activity === 'visita' ? 'requested_visit' : 'interested', sourceModule: 'stock'
    });
    return activityView(log.toObject(), can(actor, PERMISSIONS.CLIENTES_READ));
}
export async function saveVehicleFollowUp(id, taskId, payload, actor) {
    requiredObject(payload); await requireCommercialCar(id);
    const current = taskId ? await CrmTask.findOne({ _id: validId(taskId, 'taskId'), vehicleId: id }).lean() : null;
    if (taskId && !current) absent('Seguimiento');
    const values = {};
    if (!current || Object.hasOwn(payload, 'title')) values.title = commercialText(payload.title, 'title', 500, true);
    for (const field of ['responsibleText', 'resolutionNote', 'description']) if (Object.hasOwn(payload, field)) values[field] = commercialText(payload[field], field, field === 'responsibleText' ? 300 : 5000);
    if (!current || Object.hasOwn(payload, 'dueDate')) values.dueDate = commercialDate(payload.dueDate, 'dueDate');
    if (Object.hasOwn(payload, 'assignedTo')) {
        values.assignedTo = payload.assignedTo === '' || payload.assignedTo === null ? null : validId(payload.assignedTo, 'assignedTo');
        if (values.assignedTo && !await AdminUser.exists({ _id: values.assignedTo, active: true })) invalid('assignedTo', 'Elegí una persona activa del equipo.');
        values.assignedAt = new Date();
    }
    if (Object.hasOwn(payload, 'status')) {
        values.status = payload.status === 'resuelto' ? 'completada' : payload.status;
        if (!['pendiente', 'completada'].includes(values.status)) invalid('status', 'Elegí pendiente o resuelto.');
        if (values.status === 'completada') {
            if (!(values.resolutionNote ?? current?.resolutionNote)?.trim()) invalid('resolutionNote', 'Describí cómo se resolvió el seguimiento.');
            values.completedAt = new Date();
        } else values.completedAt = null;
    }
    const audit = { action: current ? 'SEGUIMIENTO_EDITADO' : 'SEGUIMIENTO_CREADO', user: actorName(actor), date: new Date(), changes: values };
    if (!current) return (await CrmTask.create({ ...values, vehicleId: id, source: 'stock', type: 'general', user: actorName(actor), auditLog: [audit] })).toObject();
    const saved = await CrmTask.findOneAndUpdate({ _id: current._id, vehicleId: id, ...versionFilter(current) }, { $set: values, $push: { auditLog: audit }, $inc: { __v: 1 } }, { new: true, runValidators: true }).lean();
    if (!saved) conflict();
    return saved;
}
