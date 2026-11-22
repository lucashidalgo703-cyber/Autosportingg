// scripts/start-academy-preview.js
// Servidor de vista previa local aislada para revisión de AutoSporting Academy 3.0.
// 100% en memoria (sin conexión con producción ni envío de emails reales).

import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bootIsolatedReplica } from '../tests/integration/isolatedReplicaHarness.js';
import { createLoginSession } from '../src/services/authSessionService.js';
import { submitChallengeAttempt, getOrCreateDailyChallenge } from '../src/services/academyDailyChallengeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const host = '127.0.0.1';
const port = 3400;
const base = `http://${host}:${port}`;

console.log('-> Iniciando réplica en memoria aislada para Academy 3.0...');
const env = await bootIsolatedReplica({ listen: false });

const mongoose = (await import('mongoose')).default;
const AdminUser = mongoose.model('AdminUser');
const Car = mongoose.model('Car');

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const defaultPassword = 'AutoSporting2026!';
const passwordHash = hashPassword(defaultPassword);

console.log('-> Creando los 4 perfiles autorizados...');
const owner = await AdminUser.create({
    name: 'Tomás Propietario',
    email: 'owner@autosporting.test',
    passwordHash,
    role: 'owner',
    active: true,
    permissions: []
});

const vendedor = await AdminUser.create({
    name: 'Lucas Vendedor',
    email: 'vendedor@autosporting.test',
    passwordHash,
    role: 'ventas',
    active: true,
    permissions: []
});

const gestoria = await AdminUser.create({
    name: 'Marta Gestora',
    email: 'gestoria@autosporting.test',
    passwordHash,
    role: 'gestoria_contabilidad',
    active: true,
    permissions: []
});

const administracion = await AdminUser.create({
    name: 'Carlos Facturación',
    email: 'administracion@autosporting.test',
    passwordHash,
    role: 'administrativo',
    active: true,
    permissions: []
});

const users = { owner, vendedor, gestoria, administracion };
const sessions = {
    owner: await createLoginSession(owner),
    vendedor: await createLoginSession(vendedor),
    gestoria: await createLoginSession(gestoria),
    administracion: await createLoginSession(administracion)
};

console.log('-> Poblando stock disponible para los desafíos diarios...');
const car1 = await Car.create({
    brand: 'Volkswagen',
    name: 'Amarok V6 Extreme 4x4',
    year: 2023,
    km: 28500,
    price: 43500000,
    currency: 'ARS',
    fuel: 'Diésel',
    color: 'Gris Indio',
    vehicleType: 'Pickup',
    condition: 'Usado',
    status: 'Disponible',
    hasManuals: 'Si',
    hasDuplicateKeys: 'Si',
    hasOfficialServices: 'Si',
    coverImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
    purchasePrice: 34000000
});

const car2 = await Car.create({
    brand: 'Toyota',
    name: 'Corolla Cross SEG Hybrid',
    year: 2022,
    km: 34000,
    price: 36800000,
    currency: 'ARS',
    fuel: 'Híbrido',
    color: 'Blanco Perlado',
    vehicleType: 'SUV',
    condition: 'Usado',
    status: 'Disponible',
    hasManuals: 'Si',
    hasDuplicateKeys: 'Si',
    hasOfficialServices: 'Si',
    coverImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'],
    purchasePrice: 28000000
});

const car3 = await Car.create({
    brand: 'Ford',
    name: 'Ranger Limited V6 4WD',
    year: 2024,
    km: 12000,
    price: 52000000,
    currency: 'ARS',
    fuel: 'Diésel',
    color: 'Azul Belice',
    vehicleType: 'Pickup',
    condition: 'Usado',
    status: 'Disponible',
    hasManuals: 'Si',
    hasDuplicateKeys: 'Si',
    hasOfficialServices: 'Si',
    coverImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'],
    purchasePrice: 41000000
});

const car4 = await Car.create({
    brand: 'Peugeot',
    name: '208 Feline Tiptronic',
    year: 2023,
    km: 19500,
    price: 24500000,
    currency: 'ARS',
    fuel: 'Nafta',
    color: 'Gris Artense',
    vehicleType: 'Hatchback',
    condition: 'Usado',
    status: 'Disponible',
    hasManuals: 'Si',
    hasDuplicateKeys: 'Si',
    hasOfficialServices: 'Si',
    coverImage: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80'],
    purchasePrice: 18000000
});

console.log('-> Sembrando evaluación previa para demostración de tablero...');
const todayChallenge = await getOrCreateDailyChallenge();
if (todayChallenge && todayChallenge.questions) {
    const answers = todayChallenge.questions.map(q => ({
        questionId: q.questionId,
        category: q.category,
        carId: q.carId,
        selectedOptionIndex: q.correctOptionIndex,
        numericResponse: q.correctNumericValue
    }));
    await submitChallengeAttempt(vendedor, {
        challengeId: todayChallenge._id,
        answers,
        durationSeconds: 165,
        attemptType: 'official_daily'
    });
}

console.log('-> Preparando servidor Next.js en modo desarrollo...');
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_API_URL = base;
delete process.env.TURBOPACK;

const next = (await import('next')).default;
const nextApp = next({
    dev: true,
    hostname: host,
    port,
    dir: root,
    conf: { distDir: '.next-academy-browser-qa' }
});

await nextApp.prepare();
const nextHandler = nextApp.getRequestHandler();

const server = http.createServer((req, res) => {
    const url = new URL(req.url, base);

    // Endpoint de inicio de sesión directo con un clic
    if (url.pathname === '/__login') {
        const role = url.searchParams.get('role') || 'owner';
        const target = url.searchParams.get('target') || (role === 'owner' ? '/admin/academy/gestion?tab=control' : '/admin/academy/desafio-diario');
        const session = sessions[role] || sessions.owner;
        const u = users[role] || users.owner;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Iniciando sesión en AutoSporting CRM...</title>
                <style>
                    body { background: #0e0e12; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #18181b; border: 1px solid #27272a; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                    .spinner { width: 32px; height: 32px; border: 3px solid rgba(239,68,68,0.2); border-top-color: #ef4444; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 1rem auto; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="spinner"></div>
                    <h3 style="margin:0 0 0.5rem 0; font-size:1.1rem;">Iniciando sesión...</h3>
                    <p style="margin:0; font-size:0.875rem; color:#a1a1aa;">Accediendo como <strong>${u.name}</strong> (${u.role})</p>
                </div>
                <script>
                    localStorage.setItem('token', ${JSON.stringify(session.token)});
                    localStorage.setItem('user', JSON.stringify(${JSON.stringify({ id: String(u._id), email: u.email, role: u.role, name: u.name, username: u.name })}));
                    localStorage.setItem('autosporting_tour_seen_${String(u._id)}', 'true');
                    setTimeout(function() {
                        window.location.href = ${JSON.stringify(target)};
                    }, 400);
                </script>
            </body>
            </html>
        `);
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        return env.app(req, res);
    }
    return nextHandler(req, res);
});

await new Promise(resolve => server.listen(port, host, resolve));

console.log('\n================================================================');
console.log('🏁 AUTOSPORTING ACADEMY 3.0 — SERVIDOR LOCAL DE REVISIÓN ACTIVO');
console.log('================================================================');
console.log(`URL Base: ${base}`);
console.log('\nACCESOS DIRECTOS DE UN CLIC (Sin escribir credenciales):');
console.log(`👉 Entrar como PROPIETARIO (Tablero de Control):  ${base}/__login?role=owner`);
console.log(`👉 Entrar como VENDEDOR (Desafío Diario):          ${base}/__login?role=vendedor`);
console.log(`👉 Entrar como GESTORÍA (Ruta de Gestoría):        ${base}/__login?role=gestoria&target=/admin/academy`);
console.log(`👉 Entrar como ADMINISTRACIÓN (Ruta Facturación):  ${base}/__login?role=administracion&target=/admin/academy`);
console.log('\nCREDENCIALES PARA LOGIN MANUAL (En caso de usar /login):');
console.log(`  Propietario:     owner@autosporting.test        | Pass: ${defaultPassword}`);
console.log(`  Vendedor:        vendedor@autosporting.test     | Pass: ${defaultPassword}`);
console.log(`  Gestoría:        gestoria@autosporting.test     | Pass: ${defaultPassword}`);
console.log(`  Administración:  administracion@autosporting.test | Pass: ${defaultPassword}`);
console.log('================================================================');
console.log('Presioná Ctrl+C para finalizar la sesión cuando termines de revisar.');

const stop = async () => {
    console.log('\nCerrando servidor de vista previa...');
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await nextApp.close();
    await env.stop();
    process.exit(0);
};

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
