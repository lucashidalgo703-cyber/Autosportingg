import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_DIR = path.join(os.tmpdir(), `autosporting-capital-reinvestment-integracion-${process.pid}`);
const SOURCE_DIR = path.join(RUN_DIR, 'app');
let UI_PORT;
let API_PORT;
const MONGO_CACHE = path.join(os.tmpdir(), 'autosporting-capital-etapa3-mongodb-binaries');
const safeKeys = ['PATH', 'Path', 'PATHEXT', 'COMSPEC', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS'];
const cleanEnv = Object.fromEntries(safeKeys.map((key) => [key, process.env[key]]).filter(([, value]) => value !== undefined));
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, cleanEnv, { MONGOMS_DOWNLOAD_DIR: MONGO_CACHE });

function isExcluded(source) {
    const relative = path.relative(REPO_ROOT, source);
    if (!relative || relative.startsWith('..')) return false;
    return relative.split(path.sep).some((part) => ['.git', 'node_modules', '.next', '.turbo', 'coverage', '.vercel'].includes(part))
        || path.basename(source).startsWith('.env');
}

function passwordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = createNetServer();
        server.once('error', () => resolve(false));
        server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
    });
}

async function choosePort(candidates) {
    for (const port of candidates) if (await isPortAvailable(port)) return port;
    throw new Error(`No hay un puerto loopback libre entre ${candidates[0]} y ${candidates.at(-1)}.`);
}

async function main() {
    UI_PORT = await choosePort(Array.from({ length: 20 }, (_, index) => 3100 + index));
    API_PORT = await choosePort(Array.from({ length: 20 }, (_, index) => 3120 + index));
    fs.mkdirSync(RUN_DIR, { recursive: true });
    fs.mkdirSync(MONGO_CACHE, { recursive: true });
    fs.cpSync(REPO_ROOT, SOURCE_DIR, { recursive: true, filter: (source) => !isExcluded(source) });
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(SOURCE_DIR, 'node_modules'), 'junction');

    const configPath = path.join(SOURCE_DIR, 'next.config.js');
    let config = fs.readFileSync(configPath, 'utf8');
    const anchor = '    async redirects() {';
    if (!config.includes(anchor)) throw new Error('No se reconoció el next.config.mjs esperado; no se modificó el proyecto fuente.');
    config = config.replace(anchor, `    async rewrites() { return [{ source: '/api/:path*', destination: 'http://127.0.0.1:${API_PORT}/api/:path*' }]; },\n${anchor}`);
    fs.writeFileSync(configPath, config);

    const mongo = await MongoMemoryServer.create({ binary: { version: '8.2.6', downloadDir: MONGO_CACHE }, instance: { ip: '127.0.0.1' } });
    const mongoUri = mongo.getUri('autosporting_capital_integration_demo');
    const parsed = new URL(mongoUri);
    if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) throw new Error(`MongoDB temporal no quedó en loopback: ${parsed.hostname}`);
    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.NODE_ENV = 'production';

    const [{ default: app }, { default: connectDB }, { default: AdminUser }, { default: TreasuryBox }, { default: TreasuryConfig }, { default: Car }, { default: Sale }, { default: Account }, { default: Transaction }, { default: TreasuryReconciliation }, mongooseModule] = await Promise.all([
        import(pathToFileURL(path.join(SOURCE_DIR, 'server.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/config/db.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/AdminUser.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/TreasuryBox.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/TreasuryConfig.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/Car.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/Sale.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/Account.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/Transaction.js')).href),
        import(pathToFileURL(path.join(SOURCE_DIR, 'src/models/TreasuryReconciliation.js')).href),
        import('mongoose')
    ]);
    const mongoose = mongooseModule.default;
    await connectDB();
    const email = 'owner.capital-integracion@autosporting.test';
    const password = crypto.randomBytes(18).toString('base64url');
    await AdminUser.create({ name: 'Propietario ficticio · Capital Integración', email, passwordHash: passwordHash(password), role: 'owner', active: true, permissions: [], twoFactorEnabled: false });
    const defaultBoxes = [
        ['operativa', 'Caja Operativa'], ['impuestos', 'Impuestos y Obligaciones'], ['deudas', 'Caja Deudas'],
        ['personal', 'Caja Personal'], ['postventa', 'Fondo Postventa'], ['reserva', 'Reserva de Liquidez'],
        ['stock', 'Caja Stock / Vehículos'], ['crecimiento', 'Fondo de Crecimiento']
    ];
    const boxes = {};
    for (const [key, name] of defaultBoxes) boxes[key] = await TreasuryBox.create({ key, name, isActive: true, balanceARS: 0, balanceUSD: 0 });
    boxes.stock.balanceARS = 0;
    await boxes.stock.save();
    boxes.operativa.balanceARS = 2000000;
    await boxes.operativa.save();
    await TreasuryConfig.create({ isSetupCompleted: true, activeDistributionScheme: 'estabilizacion', reinvestmentExtraConfigured: true, reinvestmentExtraPct: 0 });
    const account = await Account.create({ name: 'Banco ficticio ARS', type: 'Banco', currency: 'ARS', balance: 2000000, isActive: true });
    const vehicle = await Car.create({ brand: 'Vehículo', name: 'Demostración ficticia', year: 2023, km: 12000, fuel: 'Nafta', condition: 'Usado', price: 10000000, currency: 'ARS', purchasePrice: 8000000, purchaseCurrency: 'ARS', agencyOwned: true, purchasePaymentState: { modality: 'pagar_ahora', status: 'pagado', totalCost: 8000000, amountPaid: 8000000, pendingDebt: 0, currency: 'ARS' } });
    const sale = await Sale.create({ vehicleId: vehicle._id, status: 'entregada', saleDate: new Date('2026-10-01T12:00:00.000Z'), salePrice: 10000000, saleCurrency: 'ARS', exchangeRate: 1, saleExpenses: [] });
    const purchaseTx = await Transaction.create({ type: 'Egreso', amount: 8000000, currency: 'ARS', description: 'Compra ficticia', category: 'compra_vehiculo', accountId: account._id, vehicleId: vehicle._id, status: 'activo', date: new Date('2026-09-01T12:00:00.000Z') });
    const incomeTx = await Transaction.create({ type: 'Ingreso', amount: 10000000, currency: 'ARS', description: 'Venta ficticia', category: 'Venta', accountId: account._id, saleId: sale._id, vehicleId: vehicle._id, status: 'activo', source: 'venta', date: new Date('2026-10-01T12:00:00.000Z'), isTreasuryDistributed: true, treasuryBreakdown: { totalCollected: 10000000, ownGrossAmount: 10000000, capitalRecoveredToStock: 8000000, marginDistributed: 2000000, marginCollected: 2000000, extraReinvestmentToStock: 0, obligationsSeparated: 0, pendingDistributionAmount: 0 } });
    vehicle.purchasePaymentState.payments.push({ transactionId: String(purchaseTx._id), amount: 8000000, currency: 'ARS', date: purchaseTx.date, deductedFromBox: true, boxKey: 'stock' });
    await vehicle.save();
    boxes.stock.history.push(
        { type: 'recuperacion_capital', amount: 8000000, currency: 'ARS', sourceIncomeId: incomeTx._id },
        { type: 'egreso_finanzas', amount: 8000000, currency: 'ARS', sourceExpenseId: purchaseTx._id }
    );
    await boxes.stock.save();
    await TreasuryReconciliation.create({ status: 'confirmado', cutoffDate: new Date('2026-10-02T12:00:00.000Z'), accountsSnapshot: [{ accountId: account._id, currency: 'ARS', realBalance: 2000000 }] });

    const api = app.listen(API_PORT, '127.0.0.1');
    const next = spawn(process.execPath, [path.join(REPO_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', SOURCE_DIR, '--webpack', '--hostname', '127.0.0.1', '--port', String(UI_PORT)], {
        cwd: SOURCE_DIR,
        env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}` },
        stdio: 'inherit',
        windowsHide: true
    });
    let closing = false;
    const close = async () => {
        if (closing) return;
        closing = true;
        if (next.exitCode === null) next.kill();
        await new Promise((resolve) => api.close(resolve));
        await mongoose.disconnect();
        await mongo.stop();
        process.exit(0);
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
    console.log('\nDemo local aislada lista. No se cargaron archivos .env.');
    console.log(`CRM: http://127.0.0.1:${UI_PORT}/admin/tesoreria-estrategica`);
    console.log(`Login: http://127.0.0.1:${UI_PORT}/login`);
    console.log(`Usuario ficticio: ${email}`);
    console.log(`Clave temporal: ${password}`);
    console.log('MongoDB está en memoria y Express/UI escuchan únicamente en 127.0.0.1. Ctrl+C cierra estos procesos.');
    await new Promise((resolve) => next.once('exit', resolve));
    await close();
}

main().catch((error) => {
    console.error('No se pudo iniciar la demostración aislada:', error.message);
    process.exit(1);
});
