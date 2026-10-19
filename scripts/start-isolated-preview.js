// scripts/start-isolated-preview.js
// Servidor de vista previa local 100% aislado usando MongoMemoryServer (NUNCA toca producción).
// Levanta la API Express en el puerto 3001 y el servidor integrado Next.js + API en el puerto 3000.

import crypto from 'node:crypto';
import http from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import next from 'next';

const FRONTEND_PORT = Number(process.env.PREVIEW_PORT || 3000);
const API_PORT = Number(process.env.API_PORT || 3001);

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

async function startIsolatedPreview() {
    console.log('Iniciando base de datos de prueba aislada en memoria (MongoMemoryServer)...');
    const mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri('autosporting_isolated_preview');

    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_SECRET = 'isolated_preview_jwt_secret_key_2026_autosporting_secure';
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'isolated_preview_2fa_encryption_key_32bytes_min';
    process.env.NODE_ENV = 'production';

    const { default: app } = await import('../server.js');
    const { default: connectDB } = await import('../src/config/db.js');
    const { default: AdminUser } = await import('../src/models/AdminUser.js');
    const { default: Account } = await import('../src/models/Account.js');
    const { default: Car } = await import('../src/models/Car.js');
    const { default: Client } = await import('../src/models/Client.js');
    const { default: Sale } = await import('../src/models/Sale.js');
    const { default: Installment } = await import('../src/models/Installment.js');
    const { default: Transaction } = await import('../src/models/Transaction.js');
    const treasuryStrategicService = await import('../src/services/treasuryStrategicService.js');

    await connectDB();

    // Endpoint local de fotos SVG para prueba real de descarga y visualización offline de imágenes
    app.get('/demo-car-photo/:slug', (req, res) => {
        const slug = String(req.params.slug || 'vehiculo').replace(/[^a-zA-Z0-9_-]/g, '');
        const label = slug.toUpperCase().replace(/-/g, ' ');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#18181b"/>
                    <stop offset="100%" stop-color="#27272a"/>
                </linearGradient>
            </defs>
            <rect width="640" height="400" fill="url(#bg)"/>
            <rect x="24" y="24" width="592" height="352" rx="16" fill="none" stroke="#ef4444" stroke-width="3"/>
            <path d="M140 250 L190 180 L430 180 L490 250 L520 255 L520 295 L120 295 L120 255 Z" fill="#dc2626"/>
            <circle cx="205" cy="295" r="34" fill="#09090b" stroke="#e4e4e7" stroke-width="8"/>
            <circle cx="435" cy="295" r="34" fill="#09090b" stroke="#e4e4e7" stroke-width="8"/>
            <text x="320" y="105" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="bold">AUTOSPORTING DEMO</text>
            <text x="320" y="145" text-anchor="middle" fill="#f87171" font-family="Arial, sans-serif" font-size="22" font-weight="bold">${label}</text>
        </svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(svg);
    });

    // Sembrar datos de prueba
    const ownerUser = await AdminUser.create({
        name: 'Tomás Admin',
        email: 'admin@autosporting.test',
        passwordHash: hashPassword('Admin1234!'),
        role: 'owner',
        active: true,
        permissions: []
    });

    const sellerUser = await AdminUser.create({
        name: 'Lucas Vendedor',
        email: 'vendedor@autosporting.test',
        passwordHash: hashPassword('Vendedor123!'),
        role: 'ventas',
        active: true,
        permissions: []
    });

    const accArs = await Account.create({
        name: 'Caja Central ARS',
        type: 'Efectivo',
        currency: 'ARS',
        balance: 25000000,
        isActive: true
    });

    const accBankArs = await Account.create({
        name: 'Banco Galicia ARS',
        type: 'Banco',
        currency: 'ARS',
        balance: 40000000,
        isActive: true
    });

    const accUsd = await Account.create({
        name: 'Caja Fuerte USD',
        type: 'Efectivo',
        currency: 'USD',
        balance: 60000,
        isActive: true
    });

    const client1 = await Client.create({
        firstName: 'Martín',
        lastName: 'Pereyra',
        fullName: 'Martín Pereyra',
        documentNumber: '32445566',
        phone: '1155667788',
        email: 'martin@cliente.test',
        city: 'Buenos Aires'
    });

    const client2 = await Client.create({
        firstName: 'Carolina',
        lastName: 'Gómez',
        fullName: 'Carolina Gómez',
        documentNumber: '35889900',
        phone: '1144332211',
        email: 'carolina@cliente.test',
        city: 'Córdoba'
    });

    // Vehículo A (origen de cadena de permutas, vendido)
    const carHilux = await Car.create({
        brand: 'Toyota',
        name: 'Hilux SRX 4x4 AT',
        year: 2021,
        km: 42000,
        fuel: 'Diesel',
        condition: 'Usado',
        color: 'Blanco Perlado',
        plateOrVin: 'AE450KL',
        currency: 'USD',
        purchaseCurrency: 'USD',
        purchasePrice: 32000,
        price: 38000,
        status: 'Vendido',
        sold: true,
        soldAt: new Date(Date.now() - 5 * 86400000),
        agencyOwned: true,
        coverImage: '/demo-car-photo/hilux-srx.svg',
        images: ['/demo-car-photo/hilux-srx.svg'],
        expenses: [
            { concept: 'Service completo pre-entrega', amount: 500, currency: 'USD', date: new Date(Date.now() - 10 * 86400000) }
        ]
    });

    // Vehículo B (recibido en parte de pago por la venta de Hilux, disponible en stock)
    const carAmarok = await Car.create({
        brand: 'Volkswagen',
        name: 'Amarok V6 Highline',
        year: 2020,
        km: 58000,
        fuel: 'Diesel',
        condition: 'Usado',
        color: 'Gris Indium',
        plateOrVin: 'AD890MN',
        currency: 'USD',
        purchaseCurrency: 'USD',
        purchasePrice: 24000,
        price: 29500,
        status: 'Disponible',
        agencyOwned: true,
        coverImage: '/demo-car-photo/amarok-v6.svg',
        images: ['/demo-car-photo/amarok-v6.svg'],
        expenses: [
            { concept: 'Alineación y lustrado', amount: 300, currency: 'USD', date: new Date(Date.now() - 3 * 86400000) }
        ]
    });

    // Venta 1: Venta de Hilux SRX recibiendo Amarok V6 en permuta
    const saleHilux = await Sale.create({
        vehicleId: carHilux._id,
        clientId: client1._id,
        saleDate: new Date(Date.now() - 5 * 86400000),
        salePrice: 38000,
        saleCurrency: 'USD',
        paymentMethod: 'permuta',
        cashAmount: 14000,
        cashAccountId: accUsd._id,
        tradeIn: {
            enabled: true,
            brand: 'Volkswagen',
            model: 'Amarok V6 Highline',
            year: 2020,
            plateOrVin: 'AD890MN',
            amount: 24000,
            currency: 'USD',
            createdCarId: carAmarok._id
        },
        commission: 760,
        commissionCurrency: 'USD',
        commissionPercentage: 2,
        sellerUserId: sellerUser._id,
        sellerName: sellerUser.name,
        commercialConditions: {
            discountAmount: 500,
            discountReason: 'Bonificación cliente frecuente',
            includedAccessories: 'Cobertor de caja y barra antivuelco',
            transferIncluded: false,
            warrantyMonths: 3,
            deliveryCommitmentDate: new Date(Date.now() - 4 * 86400000),
            specialAgreements: 'Entrega con tanque lleno y grabado de autopartes verificado'
        },
        status: 'confirmada',
        notes: 'Operación con permuta encadenada (Hilux -> Amarok V6)',
        createdBy: ownerUser.name
    });

    carAmarok.tradeInOrigin = {
        saleId: saleHilux._id,
        originVehicleId: carHilux._id,
        value: 24000,
        currency: 'USD',
        takenAt: saleHilux.saleDate,
        linkType: 'automatica',
        linkedBy: ownerUser.name
    };
    await carAmarok.save();

    // Vehículo C (Disponible en ARS para probar edición de costo + justificación y nuevas ventas)
    const carRanger = await Car.create({
        brand: 'Ford',
        name: 'Ranger Limited 3.2 AT',
        year: 2022,
        km: 31000,
        fuel: 'Diesel',
        condition: 'Usado',
        color: 'Azul Belice',
        plateOrVin: 'AF123BC',
        currency: 'ARS',
        purchaseCurrency: 'ARS',
        purchasePrice: 31000000,
        price: 38500000,
        status: 'Disponible',
        agencyOwned: true,
        coverImage: '/demo-car-photo/ranger-ltd.svg',
        images: ['/demo-car-photo/ranger-ltd.svg'],
        expenses: [
            { concept: 'Preparación salón', amount: 150000, currency: 'ARS', date: new Date(Date.now() - 2 * 86400000) }
        ]
    });

    // Vehículo D (Vendido financiado con cuotas exigibles para probar cobro y distribución única)
    const carPeugeot = await Car.create({
        brand: 'Peugeot',
        name: '208 Feline 1.6',
        year: 2023,
        km: 14000,
        fuel: 'Nafta',
        condition: 'Usado',
        color: 'Gris Artense',
        plateOrVin: 'AG555ZZ',
        currency: 'ARS',
        purchaseCurrency: 'ARS',
        purchasePrice: 16000000,
        price: 21000000,
        status: 'Vendido',
        sold: true,
        soldAt: new Date(Date.now() - 2 * 86400000),
        agencyOwned: true,
        coverImage: '/demo-car-photo/peugeot-208.svg',
        images: ['/demo-car-photo/peugeot-208.svg']
    });

    const salePeugeot = await Sale.create({
        vehicleId: carPeugeot._id,
        clientId: client2._id,
        saleDate: new Date(Date.now() - 2 * 86400000),
        salePrice: 21000000,
        saleCurrency: 'ARS',
        paymentMethod: 'financiado',
        cashAmount: 13500000,
        cashAccountId: accArs._id,
        financedAmount: 7500000,
        installmentsCount: 3,
        commission: 315000,
        commissionCurrency: 'ARS',
        commissionPercentage: 1.5,
        sellerUserId: sellerUser._id,
        sellerName: sellerUser.name,
        commercialConditions: {
            discountAmount: 250000,
            discountReason: 'Descuento pago anticipo efectivo',
            includedAccessories: 'Polarizado antivandálico 3M',
            transferIncluded: true,
            warrantyMonths: 6,
            specialAgreements: 'Plan 3 cuotas fijas en pesos'
        },
        status: 'confirmada',
        notes: 'Venta financiada en 3 cuotas de ARS 2.500.000',
        createdBy: ownerUser.name
    });

    const inst1 = await Installment.create({
        saleId: salePeugeot._id,
        vehicleId: carPeugeot._id,
        clientId: client2._id,
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 15 * 86400000),
        amount: 2500000,
        currency: 'ARS',
        status: 'pendiente'
    });

    await Installment.create({
        saleId: salePeugeot._id,
        vehicleId: carPeugeot._id,
        clientId: client2._id,
        installmentNumber: 2,
        dueDate: new Date(Date.now() + 45 * 86400000),
        amount: 2500000,
        currency: 'ARS',
        status: 'pendiente'
    });

    await Installment.create({
        saleId: salePeugeot._id,
        vehicleId: carPeugeot._id,
        clientId: client2._id,
        installmentNumber: 3,
        dueDate: new Date(Date.now() + 75 * 86400000),
        amount: 2500000,
        currency: 'ARS',
        status: 'pendiente'
    });

    await Transaction.create({
        type: 'Egreso',
        category: 'Mantenimiento',
        concept: 'Preparación salón Ford Ranger',
        description: 'Preparación salón Ford Ranger',
        amount: 150000,
        currency: 'ARS',
        paymentMethod: 'efectivo',
        accountId: accArs._id,
        vehicleId: carRanger._id,
        status: 'activo',
        createdBy: ownerUser.name
    });

    // Configurar PIN inicial de Tesorería Estratégica (1234) y corte inicial para poder distribuir cobros
    const adminActor = { id: String(ownerUser._id), name: ownerUser.name, role: ownerUser.role };
    await treasuryStrategicService.setupInitialPin('1234', '1234', adminActor);
    await treasuryStrategicService.updateTreasuryConfig({
        operationalHorizonDays: 30,
        reserveMonths: 3,
        personalMonthlyBudgetARS: 1530000,
        postventaProvisionPerVehicleARS: 0,
        reinvestmentExtraConfigured: true,
        reinvestmentExtraPct: 10,
        autoDistributeIncomes: true,
        requirePinForAutoDistribution: false,
        surplusRule: {
            configured: true,
            stockPercent: 0,
            crecimientoPercent: 100
        },
        priorityOrder: ['operativa', 'impuestos', 'deudas', 'postventa', 'reserva', 'personal', 'stock', 'crecimiento']
    }, adminActor);
    await treasuryStrategicService.confirmInitialCutoff({
        cutoffDate: new Date(Date.now() - 86400000).toISOString(),
        reason: 'Corte inicial vista previa aislada'
    }, adminActor);

    // Vehículo E: Caso de prueba exacto de la Sección 3 ($12.700.000 inversión -> $15.500.000 venta -> $2.800.000 ganancia -> 10% extra = $1.270.000)
    const carCorolla = await Car.create({
        brand: 'Toyota',
        name: 'Corolla XEI 2.0 CVT (Caso Prueba Sección 3)',
        year: 2022,
        km: 28000,
        fuel: 'Nafta',
        condition: 'Usado',
        color: 'Gris Plata',
        plateOrVin: 'AF789XY',
        currency: 'ARS',
        purchaseCurrency: 'ARS',
        purchasePrice: 12700000,
        price: 15500000,
        status: 'Vendido',
        sold: true,
        soldAt: new Date(),
        agencyOwned: true,
        coverImage: '/demo-car-photo/corolla-xei.svg',
        images: ['/demo-car-photo/corolla-xei.svg']
    });

    const saleCorolla = await Sale.create({
        vehicleId: carCorolla._id,
        clientId: client1._id,
        customerName: client1.fullName,
        saleDate: new Date(),
        salePrice: 15500000,
        saleCurrency: 'ARS',
        paymentMethod: 'contado',
        cashAmount: 15500000,
        cashAccountId: accBankArs._id,
        commissionSettings: { mode: 'fixed', extraAmount: 0, extraCurrency: 'ARS' },
        commissionAmount: 0,
        commissionCurrency: 'ARS',
        sellerUserId: sellerUser._id,
        sellerName: sellerUser.name,
        status: 'confirmada',
        notes: 'Caso de prueba Sección 3: Inversión $12.7M, Venta $15.5M, Ganancia $2.8M, Extra 10% ($1.27M)',
        createdBy: ownerUser.name
    });

    const txCorolla = await Transaction.create({
        date: new Date(),
        type: 'Ingreso',
        category: 'Venta de Vehículo',
        concept: 'Cobro contado Toyota Corolla XEI (Prueba Sección 3)',
        description: 'Cobro contado Toyota Corolla XEI (Prueba Sección 3)',
        amount: 15500000,
        currency: 'ARS',
        paymentMethod: 'transferencia',
        accountId: accBankArs._id,
        saleId: saleCorolla._id,
        vehicleId: carCorolla._id,
        status: 'activo',
        module: 'crm_v2',
        createdBy: ownerUser.name
    });
    await treasuryStrategicService.registerCollectionForTreasury(txCorolla, { user: adminActor });

    // También registrar un cobro pendiente en bandeja (anticipo de Peugeot 208) para probar vista previa de cascada interactiva
    const txPeugeotAnticipo = await Transaction.create({
        date: new Date(),
        type: 'Ingreso',
        category: 'Entregas',
        concept: 'Anticipo entrega Peugeot 208 Feline',
        description: 'Anticipo entrega Peugeot 208 Feline',
        amount: 13500000,
        currency: 'ARS',
        paymentMethod: 'efectivo',
        accountId: accArs._id,
        saleId: salePeugeot._id,
        vehicleId: carPeugeot._id,
        status: 'activo',
        module: 'crm_v2',
        isTreasuryDistributed: false,
        createdBy: ownerUser.name
    });

    // Levantar API en API_PORT (3001) para peticiones directas a localhost:3001
    await new Promise((resolve) => {
        app.listen(API_PORT, () => {
            console.log(`[API] Express escuchando en http://localhost:${API_PORT}`);
            resolve();
        });
    });

    // Preparar Next.js (usando el build de producción en .next) y combinar con Express en FRONTEND_PORT (3000)
    const nextApp = next({ dev: false, dir: process.cwd() });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();

    const nextOwnedApiPrefixes = [
        '/api/admin/infracciones',
        '/api/admin/pedidos',
        '/api/admin/telefonos',
        '/api/test-sales'
    ];

    const server = http.createServer((req, res) => {
        const url = req.url || '/';
        const isNextOwnedApi = nextOwnedApiPrefixes.some((p) => url.startsWith(p));
        if ((url.startsWith('/api/') || url.startsWith('/demo-car-photo/')) && !isNextOwnedApi) {
            return app(req, res);
        }
        return handle(req, res);
    });

    server.listen(FRONTEND_PORT, () => {
        console.log('==============================================================');
        console.log(`VISTA PREVIA AISLADA LISTA EN: http://localhost:${FRONTEND_PORT}`);
        console.log(`Base de datos en memoria (aislada): ${mongoUri}`);
        console.log(`Usuario Admin: admin@autosporting.test / Admin1234!`);
        console.log(`PIN Tesorería Estratégica: 1234`);
        console.log(`Vehículos sembrados:`);
        console.log(`  - Hilux SRX (Vendida con Permuta): ${carHilux._id}`);
        console.log(`  - Amarok V6 (Recibida en Permuta): ${carAmarok._id}`);
        console.log(`  - Ranger Limited (Disponible ARS): ${carRanger._id}`);
        console.log(`  - Peugeot 208 (Vendido Financiado): ${carPeugeot._id}`);
        console.log(`Venta con condiciones comerciales: ${saleHilux._id}`);
        console.log(`Venta financiada con cuotas: ${salePeugeot._id} (Cuota #1: ${inst1._id})`);
        console.log('==============================================================');
    });
}

startIsolatedPreview().catch((err) => {
    console.error('Error fatal al iniciar vista previa aislada:', err);
    process.exit(1);
});
