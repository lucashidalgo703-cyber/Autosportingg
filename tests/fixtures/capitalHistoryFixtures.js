// Synthetic financial state only. All amounts are deliberately small and
// independently calculated; no employee, production or external data is used.
import crypto from 'node:crypto';
import { createLoginSession } from '../../src/services/authSessionService.js';
import { PERMISSIONS } from '../../src/utils/adminPermissions.js';

export const capitalFixtureExpected = Object.freeze({
    cost: { ARS: 16000000, USD: 15780 },
    published: { ARS: 19000000, USD: 20580 },
    stockCost: { ARS: 11000000, USD: 13200 },
    stockPublished: { ARS: 14000000, USD: 18000 },
    cash: { ARS: 5000000, USD: 1000 },
    portfolio: { ARS: 1500000, USD: 1880 },
    debt: { ARS: 1000000, USD: 200 },
    paidWithoutAccount: { ARS: 500000, USD: 100 }
});

export async function seedCapitalHistory(models) {
    const { AdminUser, Car, Account, Sale, Installment, Transaction } = models;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = salt + ':' + crypto.scryptSync('Capital-QA-Local-2026!', salt, 64).toString('hex');
    const users = await AdminUser.create([
        { name: 'Administración capital QA', email: 'admin.capital@example.test', role: 'admin', permissions: Object.values(PERMISSIONS), passwordHash },
        { name: 'Propietario capital QA', email: 'owner.capital@example.test', role: 'owner', passwordHash },
        { name: 'Vendedor capital QA', email: 'vendedor.uno@example.test', role: 'ventas', permissions: Object.values(PERMISSIONS), passwordHash },
        { name: 'Gestoría capital QA', email: 'vendedor.dos@example.test', role: 'gestoria_contabilidad', permissions: Object.values(PERMISSIONS), passwordHash }
    ]);
    const sessions = await Promise.all(users.map(user => createLoginSession(user)));
    const base = { brand: 'CapitalQA', year: 2024, km: 100, fuel: 'Nafta', condition: 'Usado', status: 'Disponible', sold: false,
        agencyOwned: true, visibleEnWeb: false, purchaseCurrency: 'ARS', currency: 'ARS', createdAt: new Date('2026-01-01T15:00:00Z') };
    const cars = await Car.create([
        { ...base, name: 'Propio ARS', plateOrVin: 'QACAP01', purchasePrice: 10000000, price: 14000000,
            expenses: [{ concept: 'Preparación ficticia', amount: 1000000, currency: 'ARS', paidBy: 'agency' }] },
        { ...base, name: 'Compartido USD', plateOrVin: 'QACAP02', purchasePrice: 20000, purchaseCurrency: 'USD', price: 30000, currency: 'USD', investor: { name: 'Socio ficticio QA', percentage: 40 },
            expenses: [{ concept: 'Preparación compartida ficticia', amount: 2000, currency: 'USD', paidBy: 'shared', agencyPercentage: 60 }] },
        { ...base, name: 'Consignado excluido', plateOrVin: 'QACAP03', agencyOwned: false, consignedBy: 'Tercero ficticio QA', purchasePrice: 700000000, price: 800000000 },
        { ...base, name: 'Vendido propio ARS', plateOrVin: 'QACAP04', status: 'Vendido', sold: true, purchasePrice: 999000000, price: 999999999 },
        { ...base, name: 'Vendido compartido USD', plateOrVin: 'QACAP05', status: 'Vendido', sold: true, purchasePrice: 50000, purchaseCurrency: 'USD', price: 60000, currency: 'USD', investor: { name: 'Socio ficticio QA', percentage: 40 } },
        { ...base, name: 'Reservado excluido', plateOrVin: 'QACAP06', status: 'Reservado', purchasePrice: 777000000, price: 888000000 },
        { ...base, name: 'Tercero excluido', plateOrVin: 'QACAP07', agencyOwned: false, purchasePrice: 800000, purchaseCurrency: 'USD', price: 900000, currency: 'USD' }
    ]);
    const sales = await Sale.create([
        { vehicleId: cars[3]._id, salePrice: 3000000, saleCurrency: 'ARS', status: 'confirmada', assignedTo: users[2]._id, salesperson: users[2].name },
        { vehicleId: cars[4]._id, salePrice: 6000, saleCurrency: 'USD', status: 'confirmada', assignedTo: users[3]._id, salesperson: users[3].name },
        { vehicleId: cars[4]._id, salePrice: 999999, saleCurrency: 'USD', status: 'cancelada' }
    ]);
    const installments = await Installment.create([
        { saleId: sales[0]._id, vehicleId: cars[3]._id, installmentNumber: 1, amount: 2000000, paidAmount: 500000, currency: 'ARS', dueDate: new Date('2026-12-20'), status: 'parcial' },
        { saleId: sales[1]._id, vehicleId: cars[4]._id, installmentNumber: 1, amount: 4000, paidAmount: 1000, currency: 'USD', dueDate: new Date('2026-12-20'), status: 'parcial' },
        { saleId: sales[2]._id, installmentNumber: 1, amount: 9000, paidAmount: 0, currency: 'USD', dueDate: new Date('2026-12-20'), status: 'pendiente' },
        { source: 'manual', vehicleId: cars[0]._id, customerName: 'Crédito ficticio QA', installmentNumber: 1, amount: 100, paidAmount: 20, currency: 'USD', dueDate: new Date('2026-12-20'), status: 'parcial' },
        { saleId: sales[0]._id, installmentNumber: 2, amount: 100000000, paidAmount: 100000000, currency: 'ARS', dueDate: new Date('2026-10-20'), status: 'pagada' }
    ]);
    const accounts = await Account.create([
        { name: 'Caja ficticia ARS', type: 'Efectivo', currency: 'ARS', balance: 5000000 },
        { name: 'Caja ficticia USD', type: 'Efectivo', currency: 'USD', balance: 1000 }
    ]);
    const txBase = { type: 'Egreso', category: 'varios', module: 'crm_v2', source: 'manual', description: 'Movimiento exclusivamente ficticio QA', date: new Date('2026-11-10T15:00:00Z'), createdBy: users[1].name };
    const transactions = await Transaction.create([
        { ...txBase, currency: 'ARS', amount: 1000000, status: 'pendiente', accountId: accounts[0]._id },
        { ...txBase, currency: 'USD', amount: 200, status: 'pendiente', accountId: accounts[1]._id },
        { ...txBase, currency: 'ARS', amount: 500000, status: 'activo', accountAssignmentStatus: 'pending', accountDebitApplied: false, idempotencyKey: 'crm-expense:capital-ars-qa' },
        { ...txBase, currency: 'USD', amount: 100, status: 'activo', accountAssignmentStatus: 'pending', accountDebitApplied: false, idempotencyKey: 'crm-expense:capital-usd-qa' },
        { ...txBase, currency: 'ARS', amount: 99999999, status: 'anulado', accountId: accounts[0]._id }
    ]);
    return { users, sessions, cars, sales, installments, accounts, transactions, expected: capitalFixtureExpected };
}

export async function seedCapitalHistoryObservations(models, fixture) {
    const { captureCapitalObservation, capitalPeriodForDate } = await import('../../src/services/capitalHistoryService.js');
    const period = capitalPeriodForDate(new Date());
    const shift = offset => { const [year, month] = period.split('-').map(Number), date = new Date(Date.UTC(year, month - 1 + offset, 15)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; };
    const owner = { id: String(fixture.users[1]._id), username: fixture.users[1].name, role: 'owner', permissions: [] };
    const snapshots = [];
    for (const [offset, arsChange, usdChange] of [[-3, -2000000, -500], [-1, -1000000, -100]]) {
        await models.Account.updateOne({ _id: fixture.accounts[0]._id }, { $inc: { balance: arsChange } });
        await models.Account.updateOne({ _id: fixture.accounts[1]._id }, { $inc: { balance: usdChange } });
        const result = await captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID(), now: new Date(shift(offset) + '-20T15:00:00Z') });
        snapshots.push(result.snapshot);
        await models.Account.updateOne({ _id: fixture.accounts[0]._id }, { $inc: { balance: -arsChange } });
        await models.Account.updateOne({ _id: fixture.accounts[1]._id }, { $inc: { balance: -usdChange } });
    }
    const current = await captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID() }); snapshots.push(current.snapshot);
    // A live preview differs from the last stored observation. Rendering it
    // must never silently replace or re-date the archived amount.
    await models.Account.updateOne({ _id: fixture.accounts[0]._id }, { $inc: { balance: 1000000 } });
    return { period, first: shift(-3), previous: shift(-1), gap: shift(-2), snapshots };
}
