import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import AuditLog from '../models/AuditLog.js';
import { computeSaleCollection } from '../utils/saleCollection.js';
import { parseDecimal, roundMoney } from '../utils/saleCommercial.js';
import { saleDateInput, SaleWorkspaceError } from '../utils/saleWorkspace.js';
const fail = (field, message, status = 400, code = 'SALE_BUYER_DECLARATION_INVALID') => { throw new SaleWorkspaceError(field, message, status, code); };
const money = (value, field) => { if (!['number', 'string'].includes(typeof value)) fail(field, 'Ingresá un importe válido.'); const parsed = parseDecimal(value); if (!Number.isFinite(parsed) || parsed <= 0) fail(field, 'El importe debe ser mayor a cero.'); return roundMoney(parsed); };
export async function declareSaleBuyerPayment({ saleId, payload, actor }) {
    if (!/^[a-f\d]{24}$/i.test(String(saleId))) fail('saleId', 'La venta no es válida.');
    const authorId = String(actor?.id || actor?.userId || ''); if (!authorId) fail('actor', 'La sesión no es válida.', 401);
    const author = actor?.username || actor?.name || 'Admin';
    if (!['external', 'historical', 'settled'].includes(payload.mode)) fail('mode', 'Elegí el tipo de registro.');
    if (!['ARS', 'USD'].includes(payload.currency)) fail('currency', 'Indicá la moneda de la venta.');
    if (typeof payload.idempotencyKey !== 'string' || !/^[\w-]{8,100}$/.test(payload.idempotencyKey)) fail('idempotencyKey', 'La solicitud requiere un identificador de reintento.');
    const date = saleDateInput(payload.date, 'date'); const expectedPendingBalance = money(payload.expectedPendingBalance, 'expectedPendingBalance');
    const reason = payload.reason ?? payload.notes;
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 5000) fail('reason', 'Escribí el motivo o constancia del registro.');
    if (payload.method != null && (typeof payload.method !== 'string' || payload.method.length > 100)) fail('method', 'Revisá el medio de pago externo.');
    const input = { mode: payload.mode, currency: payload.currency, date, reason: reason.trim(), method: (payload.method || '').trim(), expectedPendingBalance, ...(payload.mode === 'external' ? { amount: money(payload.amount, 'amount') } : {}) };
    if (input.mode === 'external' && !input.method) fail('method', 'Indicá el medio del pago externo.');
    if (input.mode === 'external' && input.amount <= 0) fail('amount', 'El importe mínimo es 0,01.');
    const hash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
    try {
        return await mongoose.connection.transaction(async session => {
            const sale = await Sale.findById(saleId).select('+externalBuyerPayments.idempotencyKey +externalBuyerPayments.payloadHash +buyerBalanceAdjustments.idempotencyKey +buyerBalanceAdjustments.payloadHash').session(session);
            if (!sale) fail('saleId', 'Venta no encontrada.', 404);
            const prior = [...(sale.externalBuyerPayments || []), ...(sale.buyerBalanceAdjustments || [])].find(row => row.idempotencyKey === payload.idempotencyKey);
            if (prior) { if (prior.payloadHash !== hash) fail('idempotencyKey', 'La solicitud ya se utilizó con otros datos.', 409); return { saleId: sale._id, declarationId: prior._id, replayed: true }; }
            if (sale.historicalOnly || ['borrador', 'cancelada'].includes(sale.status)) fail('saleId', 'Esta operación no admite nuevos registros de cobranza.', 409);
            if (sale.saleCurrency !== input.currency) fail('currency', 'Usá la moneda pactada de la venta; no se convierten importes nominalmente.');
            if (await Installment.exists({ saleId: sale._id, status: { $nin: ['pagada', 'anulada'] } }).session(session)) fail('installments', 'Esta venta tiene cuotas vigentes. Gestioná sus pagos o regularización desde Cuotas para conservar el plan.', 409, 'SALE_INSTALLMENT_WORKFLOW_REQUIRED');
            const transactions = await Transaction.find({ saleId: sale._id, status: 'activo', module: 'crm_v2' }).session(session).lean();
            const collection = computeSaleCollection(sale.toObject(), transactions);
            if (collection.pendingBalance <= 0 || roundMoney(collection.pendingBalance) !== input.expectedPendingBalance) fail('expectedPendingBalance', 'El saldo cambió. Actualizá la venta antes de registrar el cobro.', 409, 'SALE_BUYER_BALANCE_CHANGED');
            const amount = input.mode === 'external' ? input.amount : roundMoney(collection.pendingBalance);
            if (amount > collection.pendingBalance) fail('amount', 'El importe supera el saldo pendiente del comprador.');
            const common = { amount, currency: input.currency, date: new Date(input.date + 'T03:00:00.000Z'), author, authorId, idempotencyKey: payload.idempotencyKey, payloadHash: hash };
            const list = input.mode === 'external' ? sale.externalBuyerPayments : sale.buyerBalanceAdjustments;
            list.push(input.mode === 'external' ? { ...common, method: input.method, notes: input.reason } : { ...common, mode: input.mode, reason: input.reason });
            const row = list.at(-1); const action = input.mode === 'external' ? 'PAGO_EXTERNO_DECLARADO' : input.mode === 'historical' ? 'SALDO_HISTORICO_DECLARADO' : 'SALDO_DADO_POR_SALDADO';
            sale.saleAuditLog.push({ action, field: input.mode === 'external' ? 'externalBuyerPayments' : 'buyerBalanceAdjustments', details: `${input.currency} ${amount}: ${input.reason}. Declaración sin movimiento de caja; conserva estado comercial y cuotas.`, user: author, source: 'CRM_V2' });
            sale.updatedBy = author; sale.$where = { __v: sale.__v ?? 0, status: sale.status }; sale.increment(); await sale.save({ session });
            await AuditLog.create([{ userId: authorId, userName: author, userRole: actor?.role, action, module: 'ventas', entityType: 'Sale', entityId: String(sale._id), description: 'Crédito del comprador declarado sin ingreso ni egreso de caja.', metadata: { declarationId: row._id, mode: input.mode, amount, currency: input.currency, previousPendingBalance: collection.pendingBalance } }], { session });
            return { saleId: sale._id, declarationId: row._id, replayed: false };
        });
    } catch (error) {
        if (error?.name === 'VersionError' || error?.name === 'DocumentNotFoundError') fail('saleId', 'La venta cambió. Volvé a abrirla.', 409, 'SALE_BUYER_BALANCE_CHANGED');
        if (error?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(error?.message || '')) fail('saleId', 'El registro requiere MongoDB con transacciones. No se guardaron cambios.', 503);
        throw error;
    }
}
