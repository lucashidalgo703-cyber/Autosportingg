import crypto from 'node:crypto';
import fs from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const BASE_COMMIT = '66d4297';
const FRONTEND_PORT = 3100;
const API_PORT_CANDIDATES = Array.from({ length: 20 }, (_, index) => 3101 + index);
const RUNTIME_BASE = path.join(os.tmpdir(), 'autosporting-capital-reinversion-demo');
const MONGO_CACHE = path.join(RUNTIME_BASE, 'mongodb-binaries');
function sanitizeEnvironment() {
    const safeKeys = [
        'PATH', 'Path', 'PATHEXT', 'COMSPEC', 'SystemRoot', 'WINDIR',
        'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
        'PROCESSOR_ARCHITECTURE', 'NUMBER_OF_PROCESSORS'
    ];
    const safe = Object.fromEntries(safeKeys
        .map((key) => [key, process.env[key]])
        .filter(([, value]) => value !== undefined));
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, safe);
}

function ensureLocalOnlyMongo(uri) {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'mongodb:' || !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
        throw new Error(`Se rechazó un destino MongoDB no local: ${parsed.hostname}`);
    }
}

async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const probe = createNetServer();
        probe.once('error', () => resolve(false));
        probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
    });
}

async function chooseApiPort() {
    for (const port of API_PORT_CANDIDATES) {
        if (await isPortAvailable(port)) return port;
    }
    throw new Error('No hay un puerto local libre entre 3101 y 3120 para Express.');
}

function materializeSource(sourceDir) {
    fs.mkdirSync(sourceDir, { recursive: true });
    const archive = execFileSync('git', ['-c', `safe.directory=${REPO_ROOT}`, 'archive', '--format=tar', BASE_COMMIT], {
        cwd: REPO_ROOT,
        maxBuffer: 256 * 1024 * 1024
    });
    const extraction = spawnSync('tar.exe', ['-xf', '-', '-C', sourceDir], {
        input: archive,
        maxBuffer: 256 * 1024 * 1024,
        windowsHide: true
    });
    if (extraction.error || extraction.status !== 0) {
        throw extraction.error || new Error(`No se pudo extraer el snapshot ${BASE_COMMIT}: ${extraction.stderr}`);
    }

    const loadedEnvFiles = ['.env', '.env.local', '.env.development', '.env.development.local'];
    const found = loadedEnvFiles.filter((name) => fs.existsSync(path.join(sourceDir, name)));
    if (found.length) throw new Error(`La copia aislada incluye archivos de entorno no permitidos: ${found.join(', ')}`);

    const modulesLink = path.join(sourceDir, 'node_modules');
    if (!fs.existsSync(modulesLink)) fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), modulesLink, 'junction');
}

function addLocalApiProxy(sourceDir, apiPort) {
    const configPath = path.join(sourceDir, 'next.config.js');
    const existing = fs.readFileSync(configPath, 'utf8');
    const redirectAnchor = '    async redirects() {';
    if (!existing.includes(redirectAnchor)) throw new Error('No se reconoce next.config.js del commit base; no se alteró la copia.');
    const proxyConfig = `    async rewrites() {\n        return [{ source: '/api/:path*', destination: 'http://127.0.0.1:${apiPort}/api/:path*' }];\n    },\n`;
    fs.writeFileSync(configPath, existing.replace(redirectAnchor, `${proxyConfig}${redirectAnchor}`));
}

function disableRemoteLayoutAssets(sourceDir) {
    const layoutPath = path.join(sourceDir, 'src/app/layout.jsx');
    let layout = fs.readFileSync(layoutPath, 'utf8');
    layout = layout
        .replace(/^import\s+\{\s*Analytics\s*\}\s+from\s+['"]@vercel\/analytics\/react['"];?\s*\r?\n/m, '')
        .replace(/^\s*<Analytics\s*\/>\s*\r?\n/gm, '')
        .replace(/^\s*<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*\/?\s*>\s*\r?\n/gm, '');
    if (layout.includes('@vercel/analytics/react') || layout.includes('fonts.googleapis.com') || layout.includes('fonts.gstatic.com')) {
        throw new Error('No se pudieron aislar las dependencias remotas del layout de la copia local.');
    }
    fs.writeFileSync(layoutPath, layout);
}

function passwordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

async function main() {
    sanitizeEnvironment();
    fs.mkdirSync(RUNTIME_BASE, { recursive: true });
    fs.mkdirSync(MONGO_CACHE, { recursive: true });

    if (!(await isPortAvailable(FRONTEND_PORT))) {
        throw new Error(`El puerto de interfaz ${FRONTEND_PORT} ya está ocupado; no se detuvo el proceso existente.`);
    }
    const apiPort = await chooseApiPort();
    const runtimeId = `${Date.now()}-${process.pid}`;
    const sourceDir = path.join(RUNTIME_BASE, `source-${runtimeId}`);
    const emptyEnvPath = path.join(RUNTIME_BASE, 'empty-env.txt');
    fs.writeFileSync(emptyEnvPath, '', { flag: 'a' });
    materializeSource(sourceDir);
    addLocalApiProxy(sourceDir, apiPort);
    disableRemoteLayoutAssets(sourceDir);
    process.chdir(sourceDir);

    process.env.NODE_ENV = 'production'; // Evita que el import del servidor Express abra un puerto no limitado a loopback.
    process.env.PORT = String(apiPort);
    process.env.DOTENV_CONFIG_PATH = emptyEnvPath;
    process.env.MONGOMS_DOWNLOAD_DIR = MONGO_CACHE;
    process.env.MONGOMS_VERSION = '8.2.6';
    process.env.MONGOMS_SYSTEM_BINARY = '';
    process.env.MONGOMS_IP = '127.0.0.1';
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
    process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(48).toString('base64url');
    process.env.CRON_SECRET = crypto.randomBytes(32).toString('base64url');

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
    const mongoUri = mongod.getUri('autosporting_capital_reinvestment_demo');
    ensureLocalOnlyMongo(mongoUri);
    process.env.MONGODB_URI = mongoUri;

    let apiServer;
    let nextProcess;
    let mongoose;
    let shuttingDown = false;

    const shutdown = async (exitCode = 0) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log('\nCerrando únicamente la demo local...');
        if (nextProcess && nextProcess.exitCode === null) {
            await new Promise((resolve) => {
                nextProcess.once('exit', resolve);
                nextProcess.kill();
            });
        }
        if (apiServer?.listening) await new Promise((resolve) => apiServer.close(resolve));
        try { await mongoose?.disconnect(); } catch {}
        try { await mongod.stop(); } catch {}
        console.log('Interfaz, API y MongoDB temporal detenidos.');
        process.exit(exitCode);
    };

    process.once('SIGINT', () => void shutdown(0));
    process.once('SIGTERM', () => void shutdown(0));

    try {
        const [{ default: app }, { default: connectDB }, { default: AdminUser }, mongooseModule] = await Promise.all([
            import(pathToFileURL(path.join(sourceDir, 'server.js')).href),
            import(pathToFileURL(path.join(sourceDir, 'src/config/db.js')).href),
            import(pathToFileURL(path.join(sourceDir, 'src/models/AdminUser.js')).href),
            import('mongoose')
        ]);
        mongoose = mongooseModule.default;
        await connectDB();

        const email = 'owner.capital-demo@autosporting.test';
        const password = crypto.randomBytes(18).toString('base64url');
        await AdminUser.create({
            name: 'Propietario ficticio · Demo Capital',
            email,
            passwordHash: passwordHash(password),
            role: 'owner',
            active: true,
            permissions: [],
            twoFactorEnabled: false
        });

        apiServer = createHttpServer(app);
        await new Promise((resolve, reject) => {
            apiServer.once('error', reject);
            apiServer.listen(apiPort, '127.0.0.1', resolve);
        });

        process.env.NODE_ENV = 'development';
        process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${apiPort}`;
        const nextCliPath = path.join(REPO_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
        nextProcess = spawn(process.execPath, [
            nextCliPath,
            'dev',
            sourceDir,
            '--webpack',
            '--hostname', '127.0.0.1',
            '--port', String(FRONTEND_PORT)
        ], {
            cwd: sourceDir,
            env: { ...process.env },
            stdio: 'inherit',
            windowsHide: true
        });
        nextProcess.once('exit', (code) => {
            if (!shuttingDown) void shutdown(code || 1);
        });
        await new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const interval = setInterval(async () => {
                if (nextProcess.exitCode !== null) {
                    clearInterval(interval);
                    reject(new Error('Next.js terminó antes de quedar disponible.'));
                    return;
                }
                if (Date.now() - startedAt > 120000) {
                    clearInterval(interval);
                    reject(new Error('Next.js no respondió dentro de 120 segundos.'));
                    return;
                }
                try {
                    const response = await fetch(`http://127.0.0.1:${FRONTEND_PORT}/login`, { signal: AbortSignal.timeout(1500) });
                    if (response.ok) {
                        clearInterval(interval);
                        resolve();
                    }
                } catch {}
            }, 1000);
        });

        console.log('\n=== AUTO SPORTING · DEMO LOCAL AISLADA ===');
        console.log(`URL: http://127.0.0.1:${FRONTEND_PORT}/admin/capital-reinversion-demo`);
        console.log(`Login: http://127.0.0.1:${FRONTEND_PORT}/login`);
        console.log(`API Express: http://127.0.0.1:${apiPort} (loopback)`);
        console.log(`MongoDB efímero: ${new URL(mongoUri).hostname} (sólo memoria)`);
        console.log(`Usuario desechable: ${email}`);
        console.log(`Contraseña desechable: ${password}`);
        console.log('La cuenta, auditoría de login y settings de demostración viven sólo en la base efímera.');
        console.log('No se cargó .env; el código se sirve desde una extracción del commit indicado.');
        console.log('Dejá esta terminal abierta. Ctrl+C cierra sólo estos tres servicios locales.');
    } catch (error) {
        console.error('No se pudo iniciar la demo aislada:', error);
        await shutdown(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
