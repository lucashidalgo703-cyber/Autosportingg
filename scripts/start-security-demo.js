/**
 * AUTOSPORTING INTELLIGENCE — LANZADOR DEL ENTORNO LOCAL DE PRUEBA DEL PROPIETARIO
 * 
 * Inicia de forma 100% aislada:
 * 1. Comprobación estricta de no existencia de archivos .env no autorizados en disco.
 * 2. Base MongoDB ReplicaSet en memoria con validación rigurosa de host/puerto loopback.
 * 3. Carga datos mínimos de prueba sin saldos inflados y cuenta ficticia de propietario.
 * 4. Servidor Express Backend en puerto 3001 (127.0.0.1).
 * 5. Servidor Next.js Frontend en puerto 3000 con entorno hijo limpio y AUTOSPORTING_SECURITY_DEMO=1.
 * 6. Cierre y limpieza limpia de todos los procesos al presionar Ctrl+C.
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { 
    validateDemoMongoUri, 
    filterDemoChildProcessEnv, 
    checkForUnauthorizedEnvFiles,
    validateBackendPort 
} from '../src/utils/securityDemoValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Salvaguarda Previa: Comprobar que no existen archivos .env locales no autorizados
const envCheck = checkForUnauthorizedEnvFiles(rootDir);
if (!envCheck.safe) {
    console.error(`\n❌ ERROR CRÍTICO DE SEGURIDAD: Se detectaron archivos de entorno no autorizados en disco:`);
    console.error(`   ${envCheck.unauthorizedFiles.join(', ')}`);
    console.error(`   Para garantizar aislamiento total, la demo se rehúsa a iniciar con archivos .env presentes.`);
    process.exit(1);
}

// 2. Configuración de Aislamiento y Secretos Efímeros Aleatorios
process.env.DOTENV_CONFIG_PATH = path.join(rootDir, 'non_existent_demo_env');
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const AUDIT_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
const MASTER_RECOVERY_KEY = crypto.randomBytes(32).toString('hex');

// Variable explícita de servidor para el enrutamiento de Next.js (no expuesta como NEXT_PUBLIC_)
process.env.AUTOSPORTING_SECURITY_DEMO = '1';
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
    console.log('   AUTOSPORTING INTELLIGENCE — ENTORNO LOCAL DE DEMO AISLADO');
    console.log('================================================================\n');

    // Paso 1: Iniciar MongoDB en memoria con ReplicaSet
    console.log('[1/4] Iniciando MongoDB ReplicaSet efímero en memoria...');
    replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    const mongoUri = replSet.getUri('autosporting_owner_demo');

    // Validación estricta de loopback, puertos y protocolo
    const uriValidation = validateDemoMongoUri(mongoUri);
    if (!uriValidation.valid) {
        throw new Error(`VIOLACIÓN DE SEGURIDAD EN URI DE MONGO: ${uriValidation.error}`);
    }

    process.env.MONGODB_URI = mongoUri;
    console.log(`      ✓ MongoDB activo exclusivamente en loopback: ${mongoUri}`);

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

    // Sembrar cuentas de prueba para el encabezado con balance 0 (evitar exhibir saldos ficticios)
    await Account.create([
        { name: 'Caja Operativa Pesos (Demo)', currency: 'ARS', balance: 0, isActive: true },
        { name: 'Caja Dólares Tesorería (Demo)', currency: 'USD', balance: 0, isActive: true }
    ]);

    // Sembrar vehículos de prueba para stock
    await Car.create([
        { 
            brand: 'Audi', 
            name: 'Audi A4 2.0 TFSI (Demo)', 
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
            name: 'Toyota Hilux SRX 4x4 (Demo)', 
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

    // Sembrar 1 registro de auditoría HMAC inicial con usuario autenticado
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
    console.log('      ✓ Cajas (saldo neutro), stock y alertas de demostración cargadas.');

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

    // Paso 4: Iniciar Frontend Next.js (Puerto 3000) con entorno hijo limpio y filtrado
    console.log('[4/4] Iniciando Frontend Next.js en http://localhost:3000...');
    const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');

    const explicitDemoVars = {
        AUTOSPORTING_SECURITY_DEMO: '1',
        NODE_ENV: 'development',
        PORT: '3000',
        BACKEND_PORT: '3001',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        JWT_SECRET,
        TWO_FACTOR_ENCRYPTION_KEY,
        AUDIT_HMAC_SECRET,
        MASTER_RECOVERY_KEY,
        WEBAUTHN_RP_ID: 'localhost',
        WEBAUTHN_ORIGIN: 'http://localhost:3000',
        MONGODB_URI: mongoUri
    };

    const cleanChildEnv = filterDemoChildProcessEnv(process.env, explicitDemoVars);

    nextProcess = spawn(process.execPath, [nextBin, 'dev', '-p', '3000', '-H', '127.0.0.1'], {
        cwd: rootDir,
        env: cleanChildEnv,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    nextProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        // Filtrar mensajes de arranque relevantes
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
