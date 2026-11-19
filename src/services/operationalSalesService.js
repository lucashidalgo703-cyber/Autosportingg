import Sale from '../models/Sale.js';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/adminPermissions.js';
import { sellerScope } from './sellerAccessService.js';

const fields = '_id clientId vehicleId assignedTo salesperson status documentationStatus expedienteStatus expedienteResponsible expedienteDueDate estimatedDeliveryDate deliveryStatus createdAt updatedAt';
const validId = value => /^[a-f\d]{24}$/i.test(String(value || ''));
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
// Gestoría manages the documentation of all operations. Sellers retain access
// only to their assigned operations; this never changes the scope of Mis ventas.
export const operationalSaleScope = user => user?.role === ROLES.VENTAS ? sellerScope(user) : {};
const query = user => Sale.find(operationalSaleScope(user)).select(fields)
    .populate('clientId', 'firstName lastName fullName phone email documentNumber')
    .populate('vehicleId', 'brand name model year plateOrVin images')
    .populate('assignedTo', 'name username')
    .populate('expedienteResponsible', 'name username');
function authorize(user, write = false) {
    if (!hasPermission(user, write ? PERMISSIONS.GESTORIA_WRITE : PERMISSIONS.GESTORIA_READ)) fail('No tenés permiso para consultar el expediente.', 403);
}
export async function operationalSales(user) {
    authorize(user);
    return query(user).sort({ createdAt: -1 }).lean();
}
export async function operationalSale(user, id) {
    authorize(user);
    if (!validId(id)) fail('Expediente no encontrado.', 404);
    const sale = await query(user).findOne({ _id: id }).lean();
    if (!sale) fail('Expediente no encontrado.', 404);
    return sale;
}
export async function updateOperationalSale(user, id, input) {
    authorize(user, true);
    if (!validId(id)) fail('Expediente no encontrado.', 404);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisá los datos del expediente.');
    const allowed = ['documentationStatus', 'expedienteStatus', 'expedienteDueDate'];
    if (Object.keys(input).some(key => !allowed.includes(key))) fail('Esta pantalla permite modificar únicamente documentación y expediente.');
    if ('documentationStatus' in input && !hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE)) fail('No tenés permiso para modificar la documentación.', 403);
    const patch = Object.fromEntries(allowed.filter(key => key in input).map(key => [key, input[key]]));
    if ('expedienteDueDate' in patch && patch.expedienteDueDate === '') patch.expedienteDueDate = null;
    if (patch.expedienteDueDate && Number.isNaN(new Date(patch.expedienteDueDate).getTime())) fail('La fecha del expediente no es válida.');
    if (patch.expedienteDueDate) patch.expedienteDueDate = new Date(patch.expedienteDueDate);
    const existing = await Sale.findOne({ _id: id, ...operationalSaleScope(user) }).select(fields).lean();
    if (!existing) fail('Expediente no encontrado.', 404);
    const actor = String(user.name || user.username || user.email || user.id).replace(/[\r\n]/g, ' ').slice(0, 160);
    const comparable = value => value instanceof Date ? value.toISOString() : value ?? null;
    const changes = Object.entries(patch).filter(([field, value]) => comparable(existing[field]) !== comparable(value));
    if (!changes.length) return operationalSale(user, id);
    const audit = changes.map(([field, value]) => ({ action: 'ACTUALIZACION_EXPEDIENTE', field,
        oldValue: existing[field], newValue: value, user: actor, source: 'CRM_V2',
        details: 'Actualización desde el expediente documental.' }));
    const changed = await Sale.findOneAndUpdate({ _id: id, ...operationalSaleScope(user), updatedAt: existing.updatedAt }, {
        $set: { ...Object.fromEntries(changes), updatedBy: actor }, $push: { saleAuditLog: { $each: audit } }
    }, { runValidators: true, new: true });
    if (!changed) fail('El expediente cambió mientras lo editabas. Actualizá la pantalla y reintentá.', 409);
    return operationalSale(user, id);
}
