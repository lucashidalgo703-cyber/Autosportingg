import Car from '../models/Car.js';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import Quote from '../models/Quote.js';
import Pedido from '../models/Pedido.js';
import Mandate from '../models/Mandate.js';
import CrmTask from '../models/CrmTask.js';
import CommunicationLog from '../models/CommunicationLog.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { getArgentinaDateKey } from '../utils/cashProjection.js';
import { normalizePhoneToWhatsApp } from '../utils/phoneNormalizer.js';
import { buildDemandGroups, STOCK_DEMAND_PERIODS, stockPreparation } from '../utils/stockWorkbench.js';
import { stockDays, stockIsPublished, stockNeedsReview, stockCurrency } from '../utils/stockFilters.js';
import { clientContactCalendarKey } from '../utils/clientCommercial.js';
const can = (actor, permission) => ['owner', 'admin'].includes(actor?.role) || hasPermission(actor, permission);
const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
const fields = '_id brand name year km price currency status createdAt images coverImage publishedOnML inspection.updatedAt consignmentSeller location';
const carView = car => car ? { _id: car._id, brand: car.brand, name: car.name, year: car.year, status: car.status } : null;
export async function getStockOverview(now = new Date()) {
    const cars = await Car.find({ status: 'Disponible' }).select(fields).lean();
    const days = cars.map(car => stockDays(car, now)).filter(value => value !== null), value = { ARS: 0, USD: 0 }; let unknownCurrencyCount = 0;
    for (const car of cars) { const currency = stockCurrency(car.currency); if (currency && Number.isFinite(car.price)) value[currency] += car.price; else if (car.price > 0) unknownCurrencyCount++; }
    return { available: cars.length, averageDays: days.length ? Math.round(days.reduce((total, count) => total + count, 0) / days.length) : null, publishedPercent: cars.length ? Math.round(cars.filter(car => stockIsPublished(car.publishedOnML)).length * 100 / cars.length) : 0, reviewCount: cars.filter(stockNeedsReview).length, value, unknownCurrencyCount };
}
export async function getStockAttention(input, actor, now = new Date()) {
    const type = input.type || 'all', responsible = String(input.responsible || '');
    if (!['all', 'followup', 'preparation', 'mandate'].includes(type)) fail('Elegí un tipo de pendiente válido.');
    if (responsible && responsible !== 'unassigned' && !/^[a-f\d]{24}$/i.test(responsible)) fail('Elegí un responsable válido.');
    const today = getArgentinaDateKey(now), end = new Date(Date.parse(today + 'T03:00:00Z') + 86400000);
    const agendaAllowed = can(actor, PERMISSIONS.AGENDA_READ), mandatesAllowed = can(actor, PERMISSIONS.STOCK_READ);
    const [cars, tasks, mandates] = await Promise.all([
        Car.find({ status: { $in: ['Disponible', 'Reservado'] } }).select(fields).populate('consignmentSeller', 'name').lean(),
        agendaAllowed ? CrmTask.find({ vehicleId: { $ne: null }, status: 'pendiente', dueDate: { $lt: end } }).select('title dueDate vehicleId assignedTo responsibleText source').populate('assignedTo', 'name').populate('vehicleId', 'brand name year status').sort({ dueDate: 1 }).lean() : [],
        mandatesAllowed ? Mandate.find({ status: { $in: ['activo', 'vencido'] } }).select('brand model year mandateDate termDays linkedCarId createdBy representativeName status').populate('createdBy', 'name').lean() : []
    ]);
    const rows = tasks.filter(task => clientContactCalendarKey(task.dueDate) <= today).map(task => ({ _id: 'task:' + task._id, type: 'followup', title: task.title, dueDate: task.dueDate, overdue: clientContactCalendarKey(task.dueDate) < today, vehicle: carView(task.vehicleId), responsibleId: task.assignedTo?._id || null, responsibleName: task.assignedTo?.name || task.responsibleText || 'Sin asignar', taskId: task._id }));
    for (const car of cars) {
        const pending = stockPreparation(car);
        if (pending.length) rows.push({ _id: 'preparation:' + car._id, type: 'preparation', title: 'Preparación de la unidad', reasons: pending, vehicle: carView(car), dueDate: null, overdue: false, responsibleId: car.consignmentSeller?._id || null, responsibleName: car.consignmentSeller?.name || 'Sin asignar' });
    }
    for (const mandate of mandates) {
        const expires = new Date(new Date(mandate.mandateDate).getTime() + mandate.termDays * 86400000);
        const expiring = Number.isFinite(expires.getTime()) && expires < new Date(end.getTime() + 7 * 86400000);
        if (mandate.status !== 'vencido' && mandate.linkedCarId && !expiring) continue;
        rows.push({ _id: 'mandate:' + mandate._id, type: 'mandate', title: !mandate.linkedCarId ? 'Mandato sin unidad vinculada' : 'Mandato por vencer o vencido', dueDate: expires, overdue: clientContactCalendarKey(expires) < today, mandateId: mandate._id, vehicle: { _id: mandate.linkedCarId || null, brand: mandate.brand, name: mandate.model, year: mandate.year }, responsibleId: mandate.createdBy?._id || null, responsibleName: mandate.createdBy?.name || mandate.representativeName || 'Sin asignar' });
    }
    const filtered = rows.filter(row => (type === 'all' || row.type === type) && (!responsible || responsible === 'unassigned' && !row.responsibleId || String(row.responsibleId || '') === responsible));
    const byResponsible = [...new Map(rows.filter(row => row.responsibleId).map(row => [String(row.responsibleId), { _id: row.responsibleId, name: row.responsibleName }])).values()];
    return { date: today, total: filtered.length, rows: filtered, counts: { followup: rows.filter(row => row.type === 'followup').length, preparation: rows.filter(row => row.type === 'preparation').length, mandate: rows.filter(row => row.type === 'mandate').length }, responsible: byResponsible, permissions: { agendaAllowed, mandatesAllowed } };
}
export async function getStockDemand(input, actor, now = new Date()) {
    const days = Number(input.days || 90);
    if (!STOCK_DEMAND_PERIODS.includes(days)) fail('Elegí 30, 60, 90 o 180 días.');
    const includeImported = input.includeImported === undefined || input.includeImported === true || input.includeImported === 'true';
    const from = input.yearFrom ? Number(input.yearFrom) : null, to = input.yearTo ? Number(input.yearTo) : null;
    if ([from, to].some(value => value !== null && (!Number.isInteger(value) || value < 1886 || value > 9999)) || from && to && from > to) fail('Revisá el rango de años.');
    const since = new Date(Date.parse(getArgentinaDateKey(now) + 'T03:00:00Z') - (days - 1) * 86400000);
    const permissions = { pedidos: can(actor, PERMISSIONS.PEDIDOS_READ), leads: can(actor, PERMISSIONS.LEADS_READ), consultations: can(actor, PERMISSIONS.COMMUNICATIONLOGS_READ), quotes: can(actor, PERMISSIONS.COTIZACIONES_READ), clients: can(actor, PERMISSIONS.CLIENTES_READ) };
    const restrictedLogs = actor.role === 'ventas' || !can(actor, PERMISSIONS.EQUIPO_READ) && !['owner', 'admin'].includes(actor.role);
    const logsScope = restrictedLogs ? { $or: [{ assignedTo: actor.id || actor.userId }, { createdBy: actor.id || actor.userId }] } : {};
    const [cars, pedidos, leads, logs, quotes] = await Promise.all([
        Car.find({}).select(fields).lean(),
        permissions.pedidos ? Pedido.find({ status: { $in: ['Pendiente', 'Buscando'] } }).select('clientId clientName clientPhone requestedBrand requestedModel yearRange budget currency createdAt source demandValidated').lean() : [],
        permissions.leads ? Lead.find({ createdAt: { $gte: since }, crmStatus: { $nin: ['perdido', 'convertido'] } }).select('name phone clientId vehicleId createdAt leadAuditLog.source demandValidated').lean() : [],
        permissions.consultations ? CommunicationLog.find({ $and: [{ isDeleted: { $ne: true }, vehicleActivityType: { $in: ['consulta', 'oferta', 'visita'] }, contactDate: { $gte: since } }, logsScope] }).select('vehicleId clientId leadId vehicleContact contactDate').lean() : [],
        permissions.quotes ? Quote.find({ issueDate: { $gte: since }, status: { $nin: ['rechazada'] }, vehicleId: { $ne: null } }).select('clientId vehicleId price currency issueDate').lean() : []
    ]);
    const carMap = new Map(cars.map(car => [String(car._id), car]));
    const clientIds = [...new Set([...pedidos, ...leads, ...logs, ...quotes].map(item => item.clientId).filter(Boolean).map(String))];
    const clients = permissions.clients && clientIds.length ? await Client.find({ _id: { $in: clientIds } }).select('_id fullName phoneNormalized dniCuit doNotContact').lean() : [];
    const clientMap = new Map(clients.map(client => [String(client._id), client]));
    const phoneMap = new Map();
    for (const client of clients) if (client.phoneNormalized) { const key = client.phoneNormalized; phoneMap.set(key, phoneMap.has(key) ? null : String(client._id)); }
    const person = (clientId, phone, dni, leadId) => {
        if (clientId) return 'client:' + String(clientId);
        const digits = String(phone || '').replace(/\D/g, ''), normalized = digits ? normalizePhoneToWhatsApp(digits).replace(/\D/g, '') : '';
        if (normalized && phoneMap.get(normalized)) return 'client:' + phoneMap.get(normalized);
        if (String(dni || '').replace(/\D/g, '')) return 'dni:' + String(dni).replace(/\D/g, '');
        return normalized ? 'phone:' + normalized : leadId ? 'lead:' + String(leadId) : null;
    };
    const identities = (clientId, phone, dni, leadId) => [clientId && 'client:' + clientId, digitsForIdentity(phone) && 'phone:' + digitsForIdentity(phone), String(dni || '').replace(/\D/g, '') && 'dni:' + String(dni).replace(/\D/g, ''), leadId && 'lead:' + leadId].filter(Boolean);
    function digitsForIdentity(phone) { return /\d/.test(String(phone || '')) ? normalizePhoneToWhatsApp(phone).replace(/\D/g, '') : ''; }
    const demands = []; let excludedImports = 0, withoutStructuredVehicle = 0;
    for (const pedido of pedidos) {
        const imported = pedido.source === 'client_profile' && pedido.demandValidated !== true;
        if (imported && !includeImported) { excludedImports++; continue; }
        const years = /^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/.exec(String(pedido.yearRange || '').trim());
        if (pedido.yearRange && !years) { withoutStructuredVehicle++; continue; }
        demands.push({ _id: pedido._id, source: 'pedido', brand: pedido.requestedBrand, model: pedido.requestedModel, yearFrom: years ? Number(years[1]) : null, yearTo: years ? Number(years[2] || years[1]) : null, budget: pedido.budget || 0, currency: pedido.currency, clientId: permissions.clients ? pedido.clientId : null, personKey: person(pedido.clientId, pedido.clientPhone), personKeys: identities(pedido.clientId, pedido.clientPhone), name: pedido.clientName, date: pedido.createdAt, importedUnvalidated: imported });
    }
    for (const [source, records] of [['lead', leads], ['consulta', logs], ['cotizacion', quotes]]) for (const record of records) {
        const imported = source === 'lead' && record.leadAuditLog?.some(audit => /import/i.test(audit.source || '')) && record.demandValidated !== true;
        if (imported && !includeImported) { excludedImports++; continue; }
        const car = carMap.get(String(record.vehicleId));
        if (!car) { withoutStructuredVehicle++; continue; }
        const client = clientMap.get(String(record.clientId));
        const phone = record.phone || record.vehicleContact?.phone || client?.phoneNormalized, dni = record.vehicleContact?.dni || client?.dniCuit, leadId = source === 'lead' ? record._id : record.leadId;
        demands.push({ _id: record._id, source, brand: car.brand, model: car.name, yearFrom: car.year, yearTo: car.year, budget: 0, currency: car.currency, clientId: permissions.clients ? record.clientId : null, personKey: person(record.clientId, phone, dni, leadId), personKeys: identities(record.clientId, phone, dni, leadId), name: source === 'lead' ? record.name : client?.fullName || record.vehicleContact?.name || '', date: record.issueDate || record.contactDate || record.createdAt, importedUnvalidated: Boolean(imported) });
    }
    const scopedCars = cars.filter(car => (!from || car.year >= from) && (!to || car.year <= to));
    const scopedDemands = demands.filter(demand => (!from || !demand.yearTo || demand.yearTo >= from) && (!to || !demand.yearFrom || demand.yearFrom <= to));
    const built = buildDemandGroups(scopedDemands, scopedCars, now);
    const groups = built.groups.map(group => ({ ...group, requests: group.requests.map(({ personKey: _personKey, personKeys: _keys, ...row }) => row) })).filter(group => !input.search || `${group.brand} ${group.model}`.toLocaleLowerCase('es').includes(String(input.search).trim().toLocaleLowerCase('es')));
    return { days, since, permissions, groups, withoutDemand: built.withoutDemand, summary: { groups: groups.length, people: built.people, requests: scopedDemands.length, gaps: groups.filter(group => group.peopleCount > group.stockCount).length, uncoveredModels: groups.filter(group => group.peopleCount > 0 && group.stockCount === 0).length, withoutDemand: built.withoutDemand.filter(car => car.days >= 14).length }, coverage: { excludedImports, withoutStructuredVehicle, pedidosAlwaysActive: true, exactModelMatch: true, currenciesNotConverted: true } };
}
