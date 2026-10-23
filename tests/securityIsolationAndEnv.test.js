import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
    validateDemoMongoUri, 
    filterDemoChildProcessEnv, 
    checkForUnauthorizedEnvFiles,
    validateBackendPort 
} from '../src/utils/securityDemoValidator.js';
import nextConfig from '../next.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Aislamiento 1: next.config.js - Rewrites condicionales por AUTOSPORTING_SECURITY_DEMO', async () => {
    const originalEnv = { ...process.env };

    try {
        // Caso A: Modo demo activado localmente
        process.env.AUTOSPORTING_SECURITY_DEMO = '1';
        delete process.env.VERCEL;
        process.env.BACKEND_PORT = '3001';

        const demoRewrites = await nextConfig.rewrites();
        assert.ok(demoRewrites.fallback, 'Debe devolver rewrites bajo la clave fallback');
        assert.equal(demoRewrites.fallback.length, 1);
        assert.equal(demoRewrites.fallback[0].source, '/api/:path*');
        assert.equal(demoRewrites.fallback[0].destination, 'http://127.0.0.1:3001/api/:path*');

        // Caso B: Modo demo desactivado (comportamiento normal fuera de la demo)
        delete process.env.AUTOSPORTING_SECURITY_DEMO;
        const normalRewrites = await nextConfig.rewrites();
        assert.deepEqual(normalRewrites, [], 'Sin AUTOSPORTING_SECURITY_DEMO=1 no debe aplicar rewrites');

        // Caso C: Entorno Vercel (no debe activar demo en nube bajo ninguna circunstancia)
        process.env.AUTOSPORTING_SECURITY_DEMO = '1';
        process.env.VERCEL = '1';
        const vercelRewrites = await nextConfig.rewrites();
        assert.deepEqual(vercelRewrites, [], 'En Vercel los rewrites deben retornar vacío');

        // Caso D: Puerto inválido
        delete process.env.VERCEL;
        process.env.AUTOSPORTING_SECURITY_DEMO = '1';
        process.env.BACKEND_PORT = '99999'; // fuera de rango
        const invalidPortRewrites = await nextConfig.rewrites();
        assert.deepEqual(invalidPortRewrites, [], 'Puerto fuera de rango debe desactivar rewrites');

    } finally {
        process.env = originalEnv;
    }
});

test('Aislamiento 2: Validación de variables señuelo y filtrado de entorno hijo', () => {
    const fakeParentEnv = {
        PATH: 'C:\\Windows\\System32;C:\\Program Files\\nodejs',
        SYSTEMROOT: 'C:\\Windows',
        TEMP: 'C:\\Temp',
        // Variables señuelo ficticias que NO deben llegar al proceso hijo
        DECOY_AWS_SECRET_KEY: 'AKIA_EVIL_SECRET_VALUE_999',
        DECOY_PROD_MONGODB_URI: 'mongodb+srv://prod-admin:secret@atlas.example.com/production',
        DECOY_STRIPE_LIVE_KEY: 'sk_live_deceptive_token',
        AUTH_BEARER_TOKEN: 'super_secret_parent_bearer_token'
    };

    const explicitDemoVars = {
        AUTOSPORTING_SECURITY_DEMO: '1',
        NODE_ENV: 'development',
        BACKEND_PORT: '3001',
        JWT_SECRET: 'test_ephemeral_jwt_secret',
        MONGODB_URI: 'mongodb://127.0.0.1:51230/demo_isolated'
    };

    const cleanChildEnv = filterDemoChildProcessEnv(fakeParentEnv, explicitDemoVars);

    // 1. Demostrar que las variables señuelo fueron purgadas
    assert.equal(cleanChildEnv.DECOY_AWS_SECRET_KEY, undefined, 'DECOY_AWS_SECRET_KEY no debe llegar al hijo');
    assert.equal(cleanChildEnv.DECOY_PROD_MONGODB_URI, undefined, 'DECOY_PROD_MONGODB_URI no debe llegar al hijo');
    assert.equal(cleanChildEnv.DECOY_STRIPE_LIVE_KEY, undefined, 'DECOY_STRIPE_LIVE_KEY no debe llegar al hijo');
    assert.equal(cleanChildEnv.AUTH_BEARER_TOKEN, undefined, 'AUTH_BEARER_TOKEN no debe llegar al hijo');

    // 2. Verificar que las variables necesarias sí se conservan
    assert.equal(cleanChildEnv.PATH, fakeParentEnv.PATH);
    assert.equal(cleanChildEnv.AUTOSPORTING_SECURITY_DEMO, '1');
    assert.equal(cleanChildEnv.JWT_SECRET, 'test_ephemeral_jwt_secret');
    assert.equal(cleanChildEnv.MONGODB_URI, 'mongodb://127.0.0.1:51230/demo_isolated');
});

test('Aislamiento 3: Comprobación de no existencia de archivos .env no autorizados', () => {
    const res = checkForUnauthorizedEnvFiles(rootDir);
    assert.equal(res.safe, true, 'En el repositorio solo debe existir .env.example');
    assert.deepEqual(res.unauthorizedFiles, [], 'No debe haber archivos .env, .env.local o .env.production');
});

test('Aislamiento 4: Validación estricta de MongoDB URI y rechazo de cadenas engañosas', () => {
    // 1. URIs válidas de loopback local
    const validUris = [
        'mongodb://127.0.0.1:51230/autosporting_owner_demo',
        'mongodb://localhost:27017/autosporting_owner_demo',
        'mongodb://127.0.0.1:50001,127.0.0.1:50002/autosporting_owner_demo?replicaSet=rs0',
        'mongodb://[::1]:27017/autosporting_owner_demo',
        'mongodb://demo_user:demo_pass@127.0.0.1:51230/autosporting_owner_demo'
    ];

    for (const uri of validUris) {
        const check = validateDemoMongoUri(uri);
        assert.equal(check.valid, true, `Debe aceptar URI válida: ${uri}`);
        assert.ok(check.hosts.length > 0);
    }

    // 2. Cadenas engañosas y destinos externos (rechazados sin intentar conectarse)
    const deceptiveUris = [
        // Protocolo DNS SRV remoto
        'mongodb+srv://localhost.attacker.com/demo',
        'mongodb+srv://atlas.mongodb.net/production',
        // Host externo intentando engañar con localhost en la ruta o credenciales
        'mongodb://attacker.com/localhost',
        'mongodb://attacker.com/127.0.0.1',
        'mongodb://user:localhost@evil.com:27017/demo',
        'mongodb://127.0.0.1:27017@evil.com:27017/demo',
        // Subdominios fraudulentos
        'mongodb://localhost.attacker.com:27017/demo',
        'mongodb://127.0.0.1.attacker.com:27017/demo',
        // IPs externas y privadas no loopback
        'mongodb://192.168.1.50:27017/demo',
        'mongodb://10.0.0.1:27017/demo',
        'mongodb://172.16.0.1:27017/demo',
        'mongodb://0.0.0.0:27017/demo',
        // Puertos inválidos
        'mongodb://127.0.0.1:80/demo', // menor a 1024
        'mongodb://127.0.0.1:70000/demo', // mayor a 65535
        'mongodb://127.0.0.1:abc/demo', // no numérico
        // Cadena vacía / inválida
        '',
        'http://localhost:3000'
    ];

    for (const uri of deceptiveUris) {
        const check = validateDemoMongoUri(uri);
        assert.equal(check.valid, false, `Debe rechazar cadena engañosa o no autorizada: "${uri}"`);
        assert.ok(check.error, `Debe incluir motivo de rechazo para: "${uri}"`);
    }
});
