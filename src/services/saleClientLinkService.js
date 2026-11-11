import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import { getSaleBuyer } from '../utils/salePresentation.js';

export class SaleClientLinkError extends Error {
    constructor(message, statusCode = 400, code = 'SALE_CLIENT_INVALID', errors) {
        super(message); Object.assign(this, { statusCode, code, errors });
    }
}

const identity = client => ({ _id: client._id, fullName: client.fullName, phone: client.phone, email: client.email, dniCuit: client.dniCuit });
export async function createAndLinkSaleClient({ saleId, payload = {}, actor = 'Admin' }) {
    if (!/^[a-f\d]{24}$/i.test(String(saleId))) throw new SaleClientLinkError('Venta inválida.');
    try {
        return await mongoose.connection.transaction(async session => {
            const sale = await Sale.findById(saleId).session(session);
            if (!sale) throw new SaleClientLinkError('Venta no encontrada.', 404, 'SALE_NOT_FOUND');
            if (sale.clientId) {
                const linked = await Client.findById(sale.clientId).session(session);
                if (!linked) throw new SaleClientLinkError('El vínculo del cliente requiere revisión.', 409, 'SALE_CLIENT_LINK_CHANGED');
                return { saleId: sale._id, client: identity(linked), created: false };
            }
            const buyer = getSaleBuyer(sale.toObject());
            const fields = { fullName: payload.fullName ?? buyer.name, phone: payload.phone ?? buyer.phone, email: payload.email ?? buyer.email, dniCuit: payload.dniCuit ?? payload.dni ?? buyer.dni };
            const errors = {};
            for (const [key, value] of Object.entries(fields)) {
                if (typeof value !== 'string' || value.length > (key === 'fullName' ? 300 : key === 'email' ? 320 : 100)) errors[key] = 'Revisá este dato del comprador.';
                else fields[key] = value.trim();
            }
            if (!fields.fullName) errors.fullName = 'Ingresá el nombre del comprador.';
            if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Ingresá un email válido.';
            if (Object.keys(errors).length) throw new SaleClientLinkError('Revisá los datos del comprador.', 400, 'SALE_CLIENT_INVALID', errors);
            const [client] = await Client.create([{ ...fields, firstName: fields.fullName.split(' ')[0], lastName: fields.fullName.split(' ').slice(1).join(' '), source: 'otro', type: 'comprador', status: 'activo' }], { session });
            const linked = await Sale.updateOne({ _id: sale._id, clientId: null, __v: sale.__v ?? 0 }, {
                $set: { clientId: client._id, updatedBy: actor }, $inc: { __v: 1 },
                $push: { saleAuditLog: { action: 'CLIENTE_CREADO_Y_VINCULADO', field: 'clientId', newValue: String(client._id), details: 'Comprador creado y vinculado explícitamente desde la venta.', user: actor, source: 'CRM_V2' } }
            }, { session });
            if (!linked.modifiedCount) throw new SaleClientLinkError('La venta cambió. Actualizá la ficha.', 409, 'SALE_CLIENT_LINK_CHANGED');
            return { saleId: sale._id, client: identity(client), created: true };
        });
    } catch (error) {
        if (error?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(error?.message || '')) throw new SaleClientLinkError('Este vínculo requiere MongoDB con transacciones. No se creó ningún cliente.', 503, 'SALE_TRANSACTIONS_REQUIRED');
        throw error;
    }
}
