import crypto from 'node:crypto';
import { createLoginSession } from '../../src/services/authSessionService.js';

export const localPassword = 'Ficticia-Local-2026!';
const passwordHash = () => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(localPassword, salt, 64).toString('hex')}`;
};

export async function seedMobileCrm(models) {
    const { AdminUser, Car, Client, Reservation, Account } = models;
    const users = await AdminUser.create([
        { name: 'Administrador ficticio', email: 'admin@example.test', passwordHash: passwordHash(), role: 'admin', active: true },
        { name: 'Vendedor ficticio uno', email: 'vendedor.uno@example.test', passwordHash: passwordHash(), role: 'ventas', active: true },
        { name: 'Vendedor ficticio dos', email: 'vendedor.dos@example.test', passwordHash: passwordHash(), role: 'ventas', active: true },
        { name: 'Lectura ficticia', email: 'lectura@example.test', passwordHash: passwordHash(), role: 'solo_lectura', active: true }
    ]);
    const accounts = await Account.create([
        { name: 'Caja efectivo prueba', type: 'Efectivo', currency: 'ARS', balance: 1_000_000 },
        { name: 'Banco prueba uno', type: 'Banco', currency: 'ARS', balance: 2_000_000 },
        { name: 'Banco prueba dos', type: 'Banco', currency: 'ARS', balance: 3_000_000 },
        { name: 'Caja USD prueba', type: 'Efectivo', currency: 'USD', balance: 10_000 }
    ]);
    const carBase = { km: 80000, fuel: 'Diesel', condition: 'Usado', price: 32000, currency: 'U$S',
        purchasePrice: 24000, purchaseCurrency: 'USD', agencyOwned: true, visibleEnWeb: false };
    const cars = await Car.create([
        { ...carBase, brand: 'Volkswagen', name: 'Amarok Extreme', year: 2022, plateOrVin: 'QA001AA', status: 'Disponible', infoAuto: { versionName: 'Extreme V6' } },
        { ...carBase, brand: 'Volkswagen', name: 'Amarok Extreme', year: 2020, plateOrVin: 'QA002AA', status: 'Disponible', investor: { name: 'Socio ficticio', percentage: 40 } },
        { ...carBase, brand: 'Toyota', name: 'Hilux prueba reservada', year: 2021, plateOrVin: 'QA003AA', status: 'Reservado', price: 35000 },
        { ...carBase, brand: 'Ford', name: 'Ranger prueba pausada', year: 2019, plateOrVin: 'QA004AA', status: 'Pausado', notes: 'Falta verificar documentación ficticia.' },
        { ...carBase, brand: 'Renault', name: 'Duster prueba histórica', year: 2018, plateOrVin: 'QA005AA', status: 'Vendido', sold: true, soldAt: new Date() },
        { ...carBase, brand: 'Peugeot', name: '208 prueba ARS', year: 2023, plateOrVin: 'QA006AA', status: 'Disponible', currency: '$', price: 25000000, purchasePrice: 18000000, purchaseCurrency: 'ARS' },
        { ...carBase, brand: 'Chevrolet', name: 'Onix inversor prueba', year: 2022, plateOrVin: 'QA007AA', status: 'Disponible', agencyOwned: false, investor: { name: 'Inversor ficticio', percentage: 100 } }
    ]);
    const client = await Client.create({ fullName: 'Cliente ficticio reservado', firstName: 'Cliente', phone: '2974000000', email: 'cliente@example.test', dniCuit: '99000001' });
    const reservation = await Reservation.create({ vehicleId: cars[2]._id, clientId: client._id, status: 'activa', agreedPrice: 35000, agreedCurrency: 'USD',
        depositAmount: 2000, depositCurrency: 'USD', depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000),
        salesperson: users[1].name, assignedTo: users[1]._id, createdBy: users[0].name });
    const sessions = await Promise.all(users.map(user => createLoginSession(user)));
    return { users, accounts, cars, client, reservation, sessions };
}
