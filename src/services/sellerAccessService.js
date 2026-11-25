import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import { BuyerPortalDocument } from '../models/BuyerPortal.js';
import BuyerDeliveryDocument from '../models/BuyerDeliveryDocument.js';
import BuyerPaymentProof from '../models/BuyerPaymentProof.js';
import { hasPermission, isSalesRole, canManageStockMedia, canPublishStock, PERMISSIONS, ROLES } from '../utils/adminPermissions.js';

const idOf = value => String(value?._id || value || '');
const validId = value => /^[a-f\d]{24}$/i.test(idOf(value));
const fail = (message, status) => { throw Object.assign(new Error(message), { status }); };
export const sellerScope = user => isSalesRole(user)
    ? { assignedTo: validId(user.id || user.userId || user._id) ? idOf(user.id || user.userId || user._id) : { $in: [] } } : {};

export function assertSellerAssignment(user, input = {}) {
    if (!isSalesRole(user) || input.assignedTo === undefined) return;
    if (idOf(input.assignedTo) !== idOf(user.id || user.userId || user._id)) {
        fail('Sólo podés gestionar operaciones asignadas a tu cuenta.', 403);
    }
}

// An operation can display the unit being sold without exposing its stock file.
export function sellerVehicleDto(car) {
    if (!car || typeof car !== 'object' || car._bsontype || !car._id) return car;
    const fields = ['_id', 'brand', 'name', 'model', 'version', 'year', 'plateOrVin', 'price', 'currency',
        'km', 'status', 'sold', 'images', 'imagePosition', 'imagePositions', 'fuel', 'condition', 'transmission', 'color',
        'hasManuals', 'hasDuplicateKeys', 'hasCricket', 'hasWheelWrench', 'hasOfficialServices', 'checklistPhotos'];
    const result = Object.fromEntries(fields.filter(key => car[key] !== undefined).map(key => [key, car[key]]));
    if (car.infoAuto) result.infoAuto = { modelName: car.infoAuto.modelName, versionName: car.infoAuto.versionName };
    return result;
}

function commercialResponse(value) {
    if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value) || value._bsontype) return value;
    if (typeof value.toObject === 'function') value = value.toObject();
    if (Array.isArray(value)) return value.map(commercialResponse);
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
        if (['passwordHash', 'twoFactorSecret', 'recoveryCodes', 'purchasePrice', 'purchaseCurrency', 'purchasePaymentState',
            'investor', 'jointOwnership', 'tradeInOrigin', 'resolvedTradeInOrigin', 'costDiff', 'investorDiff'].includes(key)) continue;
        if (key === 'vehicleId') output[key] = sellerVehicleDto(entry);
        else if (['previousVehicleSnapshot', 'newVehicleSnapshot'].includes(key) && entry) {
            output[key] = Object.fromEntries(['brand', 'model', 'year', 'plate', 'price', 'currency'].filter(field => entry[field] !== undefined).map(field => [field, entry[field]]));
        } else if (key === 'canViewCostAndProfit') output[key] = false;
        else if (key === 'profitability') output[key] = { restricted: true, calculable: false, statusLabel: 'Restringido por permisos', missingReasons: [] };
        else output[key] = commercialResponse(entry);
    }
    return output;
}

async function ownRecord(Model, id, user) {
    if (!validId(id) || !await Model.exists({ _id: id, ...sellerScope(user) })) fail('Operación no encontrada.', 404);
}

// Called after session validation, so restrictions also apply to already-open
// sessions and to accounts with historical broad custom permission arrays.
export async function enforceSellerAccess(req, res) {
    if (!isSalesRole(req.user)) return;
    let path;
    try { path = decodeURIComponent(req.originalUrl.split('?')[0]).toLowerCase(); }
    catch { fail('Dirección no válida.', 400); }
    if (req.user.role === ROLES.VENTAS && req.method === 'POST'
        && (path === '/api/admin/clients/bulk'
            || /^\/api\/admin\/sales\/[a-f\d]{24}\/create-link-(?:client|vehicle)$/.test(path)
            || /^\/api\/admin\/sales\/[a-f\d]{24}\/trade-ins\/\d+\/create-stock-car$/.test(path))) {
        fail('El alta requiere autorización. Solicitá el alta desde Clientes o Negociación y esperá la aprobación del propietario.', 403);
    }
    const stockPresentationWrite = /^\/api\/admin\/cars\/[a-f\d]{24}\/images$/.test(path)
        && ['PUT', 'PATCH'].includes(req.method) && canManageStockMedia(req.user)
        || /^\/api\/admin\/cars\/[a-f\d]{24}\/publication$/.test(path)
        && req.method === 'PATCH' && canPublishStock(req.user);
    const blocked = /^\/api\/admin\/(?:cars|dashboard|team-dashboard|offline)(?:\/|$)/.test(path) && !stockPresentationWrite
        || /^\/api\/cars(?:\/|$)/.test(path)
        || /^\/api\/stats\/dashboard(?:\/|$)/.test(path)
        || /^\/api\/admin\/stock(?:\/|$)/.test(path) && !/^\/api\/admin\/stock\/(?:negotiation|rotation\/seller-priority|checklist|publication)(?:\/|$)/.test(path)
        || /^\/api\/admin\/sales\/[a-f\d]{24}\/trade-in-chain(?:\/|$)/.test(path)
        || /^\/api\/admin\/exports\/stock(?:\/|$)/.test(path);
    if (blocked) fail('Esta sección no está habilitada para vendedores.', 403);
    const sale = path.match(/^\/api\/admin\/(?:buyer-portal\/)?sales\/([a-f\d]{24})(?:\/|$)/);
    const reservation = path.match(/^\/api\/admin\/reservations\/([a-f\d]{24})(?:\/|$)/);
    const operationalPortal = req.user.role === ROLES.GESTORIA_CONTABILIDAD
        && hasPermission(req.user, PERMISSIONS.GESTORIA_READ)
        && /^\/api\/admin\/buyer-portal(?:\/|$)/.test(path)
        && !/\/(?:payment-proofs|payments)(?:\/|$)/.test(path);
    if (sale && !operationalPortal) await ownRecord(Sale, sale[1], req.user);
    if (reservation) await ownRecord(Reservation, reservation[1], req.user);
    if (/^\/api\/admin\/(?:sales|reservations)(?:\/|$)/.test(path)) {
        assertSellerAssignment(req.user, req.body);
        if (req.body?.reservationId) await ownRecord(Reservation, req.body.reservationId, req.user);
        const originalJson = res.json.bind(res);
        res.json = value => originalJson(commercialResponse(value));
    }
    if (path === '/api/admin/assignments' && ['sale', 'reservation'].includes(req.body?.entityType)) {
        const Model = req.body.entityType === 'sale' ? Sale : Reservation;
        await ownRecord(Model, req.body.entityId, req.user);
        assertSellerAssignment(req.user, req.body);
    }
    if (/^\/api\/admin\/buyer-portal(?:\/|$)/.test(path) && !operationalPortal) {
        if (req.query?.saleId) await ownRecord(Sale, req.query.saleId, req.user);
        if (req.body?.saleId) await ownRecord(Sale, req.body.saleId, req.user);
        const document = path.match(/^\/api\/admin\/buyer-portal\/(documents|delivery-documents|payment-proofs)\/([a-f\d]{24})(?:\/|$)/);
        if (document) {
            const Model = { documents: BuyerPortalDocument, 'delivery-documents': BuyerDeliveryDocument, 'payment-proofs': BuyerPaymentProof }[document[1]];
            const doc = await Model.findById(document[2]).select('saleId').lean();
            await ownRecord(Sale, doc?.saleId, req.user);
        }
    }
}
