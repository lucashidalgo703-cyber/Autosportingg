import Client from '../models/Client.js';
import Sale from '../models/Sale.js';
import Pedido from '../models/Pedido.js';
import { clientInsightRange } from '../utils/clientInsights.js';
import { effectiveClientContactedExpression } from '../utils/clientCommercial.js';
import { buildClientPurchaseRanking } from '../utils/clientPurchaseRanking.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';

const can = (actor, permission) => ['owner', 'admin'].includes(actor?.role) || hasPermission(actor, permission);
const periodMatch = (from, to) => from ? { createdAt: { $gte: from, $lt: to } } : {};
const metricGroup = { _id: null, total: { $sum: 1 }, sinContactar: { $sum: { $cond: ['$_contacted', 0, 1] } }, contactados: { $sum: { $cond: ['$_contacted', 1, 0] } } };
const emptyMetrics = { total: 0, sinContactar: 0, contactados: 0 };
const metrics = value => value ? { total: value.total, sinContactar: value.sinContactar, contactados: value.contactados } : { ...emptyMetrics };
const by = (key, label = key) => [{ $group: { _id: key, label: { $first: label }, count: { $sum: 1 } } }, { $sort: { count: -1, label: 1 } }, { $project: { _id: 0, key: '$_id', label: 1, count: 1 } }];

export async function getClientInsights(period, actor, now = new Date()) {
    let range;
    try { range = clientInsightRange(period || '30', now); }
    catch (error) { error.statusCode = 400; throw error; }
    const permissions = { salesAllowed: can(actor, PERMISSIONS.VENTAS_READ), requestsAllowed: can(actor, PERMISSIONS.PEDIDOS_READ) };
    const currentMatch = periodMatch(range.from, range.to);
    const [totals, distribution, dayCounts, requests, ranking] = await Promise.all([
        Client.aggregate([{ $set: { _contacted: effectiveClientContactedExpression() } }, { $facet: {
            global: [{ $count: 'total' }], current: [{ $match: currentMatch }, { $group: metricGroup }],
            previous: range.previousFrom ? [{ $match: periodMatch(range.previousFrom, range.previousTo) }, { $group: metricGroup }] : [{ $match: { _id: null } }]
        } }]),
        Client.aggregate([{ $match: currentMatch }, { $lookup: { from: 'cars', localField: 'interestedVehicleId', foreignField: '_id', as: '_vehicle', pipeline: [{ $project: { brand: 1, bodyType: 1 } }] } },
            { $lookup: { from: 'adminusers', localField: 'assignedTo', foreignField: '_id', as: '_assignee', pipeline: [{ $project: { name: 1 } }] } },
            { $set: { _brand: { $cond: [{ $ne: [{ $ifNull: ['$brand', ''] }, ''] }, '$brand', { $ifNull: [{ $first: '$_vehicle.brand' }, 'Sin marca'] }] }, _assigneeLabel: { $ifNull: [{ $first: '$_assignee.name' }, 'Sin responsable'] } } },
            { $facet: {
                bySource: by({ $ifNull: ['$source', 'otro'] }),
                byAssignee: by({ $ifNull: [{ $toString: '$assignedTo' }, 'sin_asignar'] }, '$_assigneeLabel'),
                byBrand: by('$_brand'),
                linkedVehicles: [{ $match: { '_vehicle.0': { $exists: true } } }, { $count: 'total' }],
                bodyTypeCounts: [{ $match: { '_vehicle.0': { $exists: true } } }, ...by({ $ifNull: [{ $first: '$_vehicle.bodyType' }, 'Sin carrocería'] })]
            } }]),
        Client.aggregate([{ $match: { createdAt: { $gte: new Date(`${range.byDayFromKey}T03:00:00.000Z`), $lt: new Date(`${range.byDayToKey}T03:00:00.000Z`) } } },
            { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'America/Argentina/Buenos_Aires' } }, count: { $sum: 1 } } }]),
        permissions.requestsAllowed ? Pedido.aggregate([{ $match: { ...currentMatch, status: { $in: ['Pendiente', 'Buscando'] } } }, { $facet: { total: [{ $count: 'total' }], byBrand: by('$requestedBrand') } }]) : null,
        permissions.salesAllowed ? Promise.all([
            Sale.find({ status: { $in: ['entregada', 'señado', 'confirmada', 'pendiente_entrega'] } }).select('clientId status saleDate createdAt salePrice saleCurrency historicalOnly draftData.buyerDni buyerDni buyerDocument').lean(),
            Client.find().select('fullName dniCuit').lean()
        ]).then(([sales, clients]) => buildClientPurchaseRanking(sales, clients, range)) : null
    ]);
    const allDays = [];
    for (let date = Date.parse(`${range.byDayFromKey}T00:00:00.000Z`); date < Date.parse(`${range.byDayToKey}T00:00:00.000Z`); date += 86400000) {
        const key = new Date(date).toISOString().slice(0, 10); allDays.push({ key, count: dayCounts.find(item => item._id === key)?.count || 0 });
    }
    const summary = totals[0] || {};
    const charts = distribution[0] || {};
    return {
        period: period || '30', range: { from: range.from, to: range.to, previousFrom: range.previousFrom, previousTo: range.previousTo }, permissions,
        totalGlobal: summary.global?.[0]?.total || 0, current: metrics(summary.current?.[0]), previous: range.previousFrom ? metrics(summary.previous?.[0]) : null,
        byDay30: allDays, bySource: charts.bySource || [], byAssignee: charts.byAssignee || [], byBrand: charts.byBrand || [],
        linkedVehicleCount: charts.linkedVehicles?.[0]?.total || 0, bodyTypeCounts: charts.bodyTypeCounts || [],
        activeRequestsCount: requests ? requests[0]?.total?.[0]?.total || 0 : null, byRequestBrand: requests ? requests[0]?.byBrand || [] : null,
        purchaseRanking: ranking?.purchaseRanking ?? null, openPurchaseRanking: ranking?.openPurchaseRanking ?? null, rankingSummary: ranking?.rankingSummary ?? null,
        coverage: { contacts: 'Confirmación de contacto independiente; compatibilidad con historial legado', clients: 'Fecha de alta del cliente', requests: 'Fecha de alta del pedido activo', purchases: 'Fecha calendario de ventas entregadas; abiertas separadas', byDay30: 'Últimos 30 días calendario, independiente del período seleccionado' }
    };
}
