/**
 * AUTOSPORTING INTELLIGENCE — LANZADOR DEL ENTORNO LOCAL DE PRUEBA DEL PROPIETARIO
 * 
 * Inicia de forma 100% aislada:
 * 1. Base MongoDB ReplicaSet en memoria (MongoMemoryReplSet con soporte completo de transacciones).
 * 2. Carga datos mínimos de prueba y cuenta ficticia de propietario (demo.owner@autosporting.local).
 * 3. Servidor Express Backend en puerto 3001 (127.0.0.1).
 * 4. Servidor Next.js Frontend en puerto 3000 (127.0.0.1) con enrutamiento automático de /api/*.
 * 5. Cierre y limpieza limpia de todos los procesos al presionar Ctrl+C.
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Configuración de Aislamiento y Secretos Efímeros Aleatorios
process.env.DOTENV_CONFIG_PATH = path.join(rootDir, 'non_existent_demo_env');
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const AUDIT_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
const MASTER_RECOVERY_KEY = crypto.randomBytes(32).toString('hex');

process.env.JWT_SECRET = JWT_SECRET;
process.env.TWO_FACTOR_ENCRYPTION_KEY = TWO_FACTOR_ENCRYPTION_KEY;
process.env.AUDIT_HMAC_SECRET = AUDIT_HMAC_SECRET;
process.env.MASTER_RECOVERY_KEY = MASTER_RECOVERY_KEY;
process.env.WEBAUTHN_RP_ID = 'localhost';
process.env.WEBAUTHN_ORIGIN = 'http://localhost:3000';
process.env.BACKEND_PORT = '3001';
process.env.PORT = '3001';
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

const DEMO_CREDENTIALS = {
    email: 'demo.owner@autosporting.local',
    password: 'DemoPropietario2026!',
    name: 'Propietario Demo Local'
};

let replSet = null;
let expressServer = null;
let nextProcess = null;
let mongoose = null;

async function startDemo() {
    console.log('\n================================================================');
    console.log('   AUTOSPORTING INTELLIGENCE — ENTORNO LOCAL DE DEMO');
    console.log('================================================================\n');

    // Paso 1: Iniciar MongoDB en memoria con ReplicaSet
    console.log('[1/4] Iniciando MongoDB ReplicaSet efímero en memoria...');
    replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    const mongoUri = replSet.getUri('autosporting_owner_demo');

    // Salvaguarda obligatoria de no-conexión externa
    if (!mongoUri.includes('127.0.0.1') && !mongoUri.includes('localhost')) {
        throw new Error('VIOLACIÓN DE SEGURIDAD: Conexión externa detectada. Abortando.');
    }

    process.env.MONGODB_URI = mongoUri;
    console.log(`      ✓ MongoDB activo en ${mongoUri}`);

    // Paso 2: Conectar e inyectar datos ficticios
    console.log('[2/4] Conectando y sembrando cuenta ficticia y datos del CRM...');
    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    const AdminUser = (await import('../src/models/AdminUser.js')).default;
    const Account = (await import('../src/models/Account.js')).default;
    const Car = (await import('../src/models/Car.js')).default;
    const SecurityAlert = (await import('../src/models/SecurityAlert.js')).default;
    const TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    const AuditLog = (await import('../src/models/AuditLog.js')).default;

    // Crear cuenta de propietario ficticia
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(DEMO_CREDENTIALS.password, salt, 64).toString('hex');
    const ownerUser = await AdminUser.create({
        name: DEMO_CREDENTIALS.name,
        email: DEMO_CREDENTIALS.email,
        passwordHash: `${salt}:${hash}`,
        role: 'owner',
        active: true,
        permissions: ['*'],
        twoFactorEnabled: false
    });

    // Sembrar cuentas de prueba para el encabezado
    await Account.create([
        { name: 'Caja Operativa Pesos (Demo)', currency: 'ARS', balance: 14850000, isActive: true },
        { name: 'Caja Dólares Tesorería (Demo)', currency: 'USD', balance: 35000, isActive: true }
    ]);

    // Sembrar vehículos de prueba para stock
    await Car.create([
        { 
            brand: 'Audi', 
            name: 'Audi A4 2.0 TFSI', 
            year: 2022, 
            km: 28000, 
            fuel: 'Nafta', 
            condition: 'Usado', 
            price: 38000, 
            currency: 'U$S', 
            status: 'Disponible' 
        },
        { 
            brand: 'Toyota', 
            name: 'Toyota Hilux SRX 4x4', 
            year: 2023, 
            km: 15000, 
            fuel: 'Diesel', 
            condition: 'Usado', 
            price: 46000, 
            currency: 'U$S', 
            status: 'Disponible' 
        }
    ]);

    // Sembrar 1 terminal confiable de referencia
    await TrustedDevice.create({
        deviceId: 'terminal_agencia_demo',
        deviceName: 'PC Agencia Principal',
        status: 'trusted',
        registeredBy: { userId: String(ownerUser._id), name: ownerUser.name },
        lastSeenAt: new Date()
    });

    // Sembrar 1 alerta pendiente de referencia para probar revisión
    await SecurityAlert.create({
        alertId: `ALT-DEMO-${Date.now()}`,
        type: 'AUTH_CONFIG_CHANGED',
        severity: 'warning',
        title: 'Verificación de configuración de seguridad',
        description: 'Alerta de demostración lista para ser revisada por el propietario en el Centro de Seguridad.',
        userEmail: DEMO_CREDENTIALS.email,
        ip: '127.0.0.1',
        status: 'pending'
    });

    // Sembrar 1 registro de auditoría HMAC
    await AuditLog.create({
        userId: String(ownerUser._id),
        userName: ownerUser.name,
        userEmail: ownerUser.email,
        action: 'INICIALIZACION_DEMO_LOCAL',
        module: 'seguridad',
        description: 'Entorno de demostración local iniciado en memoria aislada.',
        ip: '127.0.0.1'
    });

    console.log('      ✓ Cuenta ficticia de propietario creada.');
    console.log('      ✓ Cajas, stock y alertas de demostración cargadas.');

    // Paso 3: Iniciar Servidor Express Backend (Puerto 3001)
    console.log('[3/4] Iniciando Backend Express en http://127.0.0.1:3001...');
    const serverModule = await import('../server.js');
    const app = serverModule.default || serverModule.app;

    expressServer = http.createServer(app);
    await new Promise((resolve, reject) => {
        expressServer.listen(3001, '127.0.0.1', (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
    console.log('      ✓ Backend Express escuchando en http://127.0.0.1:3001');

    // Paso 4: Iniciar Frontend Next.js (Puerto 3000)
    console.log('[4/4] Iniciando Frontend Next.js en http://localhost:3000...');
    const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');

    nextProcess = spawn(process.execPath, [nextBin, 'dev', '-p', '3000', '-H', '127.0.0.1'], {
        cwd: rootDir,
        env: {
            ...process.env,
            BACKEND_PORT: '3001',
            NEXT_PUBLIC_API_URL: 'http://localhost:3001'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    nextProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        // Filtrar ruido de Turbopack para mantener la terminal limpia
        if (msg.includes('Ready in') || msg.includes('compiled') || msg.includes('Starting')) {
            console.log(`      [Next.js] ${msg.trim()}`);
        }
    });

    nextProcess.stderr.on('data', (data) => {
        const err = data.toString();
        if (!err.includes('ExperimentalWarning')) {
            console.error(`      [Next.js Error] ${err.trim()}`);
        }
    });

    // Esperar 3 segundos a que Next.js levante
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n================================================================');
    console.log('   🎉 ENTORNO LOCAL LISTO PARA LA PRUEBA DEL PROPIETARIO');
    console.log('================================================================\n');
    console.log('   Acceso Web CRM:       http://localhost:3000/login');
    console.log('   Centro de Seguridad:  http://localhost:3000/admin/seguridad');
    console.log('   Configurar 2FA:       http://localhost:3000/admin/configuracion/2fa\n');
    console.log('   --- CREDENCIALES DESECHABLES DE PRUEBA ---');
    console.log(`   Usuario:   ${DEMO_CREDENTIALS.email}`);
    console.log(`   Clave:     ${DEMO_CREDENTIALS.password}\n`);
    console.log('   Para finalizar y limpiar todos los datos de memoria: Presione Ctrl+C');
    console.log('================================================================\n');
}

async function cleanup() {
    console.log('\n\n[Limpieza] Deteniendo servidores y eliminando base temporal en memoria...');
    if (nextProcess) {
        try { nextProcess.kill(); } catch {}
    }
    if (expressServer) {
        try {
            await new Promise((resolve) => expressServer.close(resolve));
        } catch {}
    }
    if (mongoose && mongoose.connection) {
        try { await mongoose.connection.close(); } catch {}
    }
    if (replSet) {
        try { await replSet.stop(); } catch {}
    }
    console.log('[Limpieza] Base de datos en memoria descartada. Cero procesos residuales.');
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

startDemo().catch(async (err) => {
    console.error('\n❌ ERROR AL INICIAR LA DEMO:', err);
    await cleanup();
});
