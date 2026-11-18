// Synthetic identities and operations shared by isolated API/browser permission tests.
import crypto from 'node:crypto';
import { createLoginSession } from '../../src/services/authSessionService.js';
import { PERMISSIONS } from '../../src/utils/adminPermissions.js';

export const sellerAccessPassword = 'Vendedores-QA-Local-2026!';
const passwordHash = () => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(sellerAccessPassword, salt, 64).toString('hex')}`;
};

export async function seedSellerAccess(models) {
    const { AdminUser, Car, Client, Sale, Reservation, Quote, StockNegotiationPolicy, BuyerDeliveryDocument, BuyerPaymentProof } = models;
    const users = await AdminUser.create([
        { name: 'Administración QA', email: 'admin@example.test', role: 'admin', passwordHash: passwordHash() },
        { name: 'Dirección QA', email: 'owner@example.test', role: 'owner', passwordHash: passwordHash() },
        { name: 'Vendedor homónimo QA', email: 'vendedor.uno@example.test', role: 'ventas', passwordHash: passwordHash(), permissions: Object.values(PERMISSIONS) },
        { name: 'Vendedor homónimo QA', email: 'vendedor.dos@example.test', role: 'ventas', passwordHash: passwordHash() }
    ]);
    const clients = await Client.create([
        { firstName: 'Comprador A QA', fullName: 'Comprador A QA', phone: '990000001', email: 'comprador-a@example.test' },
        { firstName: 'Comprador B QA', fullName: 'Comprador B QA', phone: '990000002', email: 'comprador-b@example.test' }
    ]);
    const carBase = { brand: 'PermisosQA', year: 2024, km: 10000, fuel: 'Nafta', condition: 'Usado', price: 20000000,
        currency: 'ARS', purchasePrice: 14000000, purchaseCurrency: 'ARS', agencyOwned: true, visibleEnWeb: false,
        notes: 'Nota interna ficticia no apta para selector', ownerPhone: 'PRIVADO-QA',
        expenses: [{ concept: 'Preparación QA', amount: 1000000, currency: 'ARS', paidBy: 'agency' }] };
    const cars = await Car.create([
        { ...carBase, name: 'Compra propia A', plateOrVin: 'QAVENTA1', status: 'Vendido', sold: true },
        { ...carBase, name: 'Compra propia B', plateOrVin: 'QAVENTA2', status: 'Vendido', sold: true },
        { ...carBase, name: 'Venta histórica sin ID', plateOrVin: 'QAHIST01', status: 'Vendido', sold: true },
        { ...carBase, name: 'Reserva propia A', plateOrVin: 'QARESERVA1', status: 'Reservado' },
        { ...carBase, name: 'Reserva propia B', plateOrVin: 'QARESERVA2', status: 'Reservado' },
        { ...carBase, name: 'Unidad negociable', plateOrVin: 'QANEGOCIA', status: 'Disponible' }
    ]);
    const sales = await Sale.create([
        { vehicleId: cars[0]._id, clientId: clients[0]._id, assignedTo: users[2]._id, salesperson: users[2].name, salePrice: 20000000, saleCurrency: 'ARS', status: 'confirmada' },
        { vehicleId: cars[1]._id, clientId: clients[1]._id, assignedTo: users[3]._id, salesperson: users[2].name, salePrice: 21000000, saleCurrency: 'ARS', status: 'confirmada' },
        { vehicleId: cars[2]._id, clientId: clients[0]._id, salesperson: users[2].name, salePrice: 22000000, saleCurrency: 'ARS', status: 'confirmada' }
    ]);
    const reservationBase = { status: 'activa', agreedPrice: 20000000, agreedCurrency: 'ARS', depositAmount: 100000,
        depositCurrency: 'ARS', depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000), salesperson: users[2].name };
    const reservations = await Reservation.create([
        { ...reservationBase, vehicleId: cars[3]._id, clientId: clients[0]._id, assignedTo: users[2]._id },
        { ...reservationBase, vehicleId: cars[4]._id, clientId: clients[1]._id, assignedTo: users[3]._id }
    ]);
    const quotes = await Quote.create([
        { quoteNumber: 990001, clientId: clients[0]._id, vehicleId: cars[5]._id, assignedTo: users[2]._id, price: 20000000, currency: 'ARS' },
        { quoteNumber: 990002, clientId: clients[1]._id, vehicleId: cars[5]._id, assignedTo: users[3]._id, price: 20000000, currency: 'ARS' }
    ]);
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const { encryptPortalFile } = await import('../../src/services/buyerPortalFileService.js');
    const file = Buffer.from('%PDF-1.4\nDocumento exclusivamente ficticio QA\n%%EOF');
    const metadata = { fileName: 'documento-qa.pdf', mimeType: 'application/pdf', byteLength: file.length,
        fileHash: crypto.createHash('sha256').update(file).digest('hex') };
    const deliveryDocuments = [], paymentProofs = [];
    for (const [index, sale] of sales.slice(0, 2).entries()) {
        const id = new Sale.db.base.Types.ObjectId(), proofId = new Sale.db.base.Types.ObjectId();
        const relation = { saleId: sale._id, clientId: clients[index]._id, vehicleId: cars[index]._id };
        deliveryDocuments.push(await BuyerDeliveryDocument.create({ ...relation, ...metadata, _id: id, logicalId: id, type: 'title',
            requestId: 'delivery-qa-' + index, requestFingerprint: 'delivery-fixture-' + index,
            encryptedFile: encryptPortalFile(file, 'delivery', String(id)) }));
        paymentProofs.push(await BuyerPaymentProof.create({ ...relation, ...metadata, _id: proofId, requestId: 'proof-qa-' + index,
            dedupeHash: 'payment-fixture-' + index, amount: 100000, currency: 'ARS', paymentDate: new Date(), concept: 'Seña QA', targetType: 'deposit',
            encryptedFile: encryptPortalFile(file, 'payment', String(proofId)) }));
    }
    await StockNegotiationPolicy.create({ _id: 'global', rule: { mode: 'amount', value: 1000000 }, revision: 1 });
    const sessions = await Promise.all(users.map(user => createLoginSession(user)));
    return { users, clients, cars, sales, reservations, quotes, deliveryDocuments, paymentProofs, sessions };
}
