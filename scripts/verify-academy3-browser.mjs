// scripts/verify-academy3-browser.mjs
// Verificación visual integral con Playwright y Chromium para AutoSporting Academy 3.0:
// Desafío Diario, runner de examen con stock real, autocorrección, Control de Capacitación del Propietario,
// Ficha individual del vendedor, Revisión con invalidación y Cajón de notificaciones.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { bootIsolatedReplica } from '../tests/integration/isolatedReplicaHarness.js';
import { createLoginSession } from '../src/services/authSessionService.js';

const { chromium } = await import('file:///C:/Users/Tomas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const host = '127.0.0.1';
const port = 3995;
const base = `http://${host}:${port}`;

const localScreenshotsDir = path.resolve(root, 'artifacts', 'screenshots');
const brainScreenshotsDir = 'C:\\Users\\Tomas\\.gemini\\antigravity\\brain\\c0111ef9-51a1-4d75-aa1f-ee925deb91eb\\screenshots';
fs.mkdirSync(localScreenshotsDir, { recursive: true });
fs.mkdirSync(brainScreenshotsDir, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('-> 1. Iniciando réplica de base de datos aislada...');
const env = await bootIsolatedReplica({ listen: false });

const mongoose = (await import('mongoose')).default;
const AdminUser = mongoose.model('AdminUser');
const Car = mongoose.model('Car');

const crypto = (await import('node:crypto')).default;
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

console.log('-> 2. Creando perfiles ficticios y stock disponible...');
const owner = await AdminUser.create({
    name: 'Tomás Propietario',
    email: 'owner.academy3.qa@autosporting.test',
    passwordHash: hashPassword('OwnerPass123!'),
    role: 'owner',
    active: true,
    permissions: []
});

const vendedor = await AdminUser.create({
    name: 'Rodrigo Vendedor',
    email: 'rodrigo.vendedor.qa@autosporting.test',
    passwordHash: hashPassword('VendedorPass123!'),
    role: 'ventas',
    active: true,
    permissions: []
});

// Sembrar vehículos de prueba en stock
await Car.create({
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

await Car.create({
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

await Car.create({
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

await Car.create({
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

const ownerSession = await createLoginSession(owner);
const vendedorSession = await createLoginSession(vendedor);

console.log('-> 3. Levantando servidor Next.js QA...');
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
    const pathname = new URL(req.url, base).pathname;
    if (pathname.startsWith('/api/')) {
        return env.app(req, res);
    }
    return nextHandler(req, res);
});

await new Promise(resolve => server.listen(port, host, resolve));
console.log(`   Servidor local listo en ${base}`);

console.log('-> 4. Lanzando Chromium...');
const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']
});

const saveDualScreenshot = async (page, filename) => {
    const p1 = path.join(localScreenshotsDir, filename);
    const p2 = path.join(brainScreenshotsDir, filename);
    await page.screenshot({ path: p1, fullPage: true });
    fs.copyFileSync(p1, p2);
    console.log(`   OK: Guardada captura ${filename}`);
};

const gotoPage = async (page, urlPath) => {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await page.goto(`${base}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        } catch (err) {
            if (attempt === 2) throw err;
            await page.waitForTimeout(500);
        }
    }
};

try {
    // =========================================================================
    // VENDEDOR: DESAFÍO DIARIO
    // =========================================================================
    console.log('-> 5. Verificando vista Vendedor: Desafío Diario (/admin/academy/desafio-diario)...');
    const vContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await vContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: vendedorSession.token,
        user: { id: String(vendedor._id), email: vendedor.email, role: vendedor.role, name: vendedor.name, username: vendedor.name }
    });

    const vPage = await vContext.newPage();
    await gotoPage(vPage, '/admin/academy/desafio-diario');
    await vPage.waitForSelector('text=Desafío Diario de Ventas', { timeout: 45000 });
    await vPage.waitForTimeout(1000);

    // Captura 08: Vendedor Desafío Diario Landing
    await saveDualScreenshot(vPage, '08-vendedor-desafio-diario.png');

    // Iniciar examen
    console.log('-> 6. Iniciando runner del Desafío Diario...');
    const startBtn = await vPage.waitForSelector('text=Iniciar Desafío Oficial del Día', { timeout: 15000 });
    await startBtn.click();
    await vPage.waitForSelector('text=Pregunta 1 de 8', { timeout: 15000 });
    await vPage.waitForTimeout(1000);

    // Captura 09: Examen en curso
    await saveDualScreenshot(vPage, '09-vendedor-quiz-running.png');

    // Responder las 8 preguntas haciendo clic en la primera opción o completando número
    console.log('-> 7. Completando preguntas del Desafío Diario...');
    for (let i = 0; i < 8; i++) {
        await vPage.waitForSelector(`text=Pregunta ${i + 1} de 8`, { timeout: 15000 });
        
        // Verificar si es entrada numérica o multiple choice
        const numInput = await vPage.$('input');
        if (numInput) {
            await numInput.fill('$ 43.500.000');
        } else {
            // Clic en la primera opción de respuesta (Opción A)
            const optionBtn = (await vPage.$('button:has(span:text-is("A"))')) || (await vPage.$('button[class*="border-zinc-800"]'));
            if (optionBtn) {
                await optionBtn.click();
            }
        }
        await vPage.waitForTimeout(300);

        if (i < 7) {
            const nextBtn = await vPage.waitForSelector('text=Siguiente →', { timeout: 10000 });
            await nextBtn.click();
            await vPage.waitForTimeout(500);
        } else {
            const finishBtn = await vPage.waitForSelector('text=Finalizar y Calificar ✓', { timeout: 10000 });
            await finishBtn.click();
        }
    }

    // Esperar vista de resultados
    await vPage.waitForSelector('text=Desafío Oficial Completado', { timeout: 20000 });
    await vPage.waitForTimeout(1000);

    // Captura 10: Resultado del examen
    await saveDualScreenshot(vPage, '10-vendedor-quiz-result.png');
    await vContext.close();

    // =========================================================================
    // PROPIETARIO: CONTROL DE CAPACITACIÓN & SUPERVISIÓN
    // =========================================================================
    console.log('-> 8. Verificando perfil Propietario: Control de Capacitación (/admin/academy/gestion)...');
    const oContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await oContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: ownerSession.token,
        user: { id: String(owner._id), email: owner.email, role: owner.role, name: owner.name, username: owner.name }
    });

    const oPage = await oContext.newPage();
    await gotoPage(oPage, '/admin/academy/gestion?tab=control');
    await oPage.waitForSelector('text=Control de Capacitación y Seguimiento', { timeout: 45000 });
    await oPage.waitForTimeout(1500);

    // Captura 11: Tablero general de control
    await saveDualScreenshot(oPage, '11-owner-control-overview.png');

    // Abrir Ficha Individual del Vendedor
    console.log('-> 9. Abriendo Ficha Individual del Vendedor...');
    const fichaBtn = await oPage.waitForSelector('text=Ficha Individual →', { timeout: 15000 });
    await fichaBtn.click();
    await oPage.waitForSelector('text=Ficha de Capacitación Comercial', { timeout: 15000 });
    await oPage.waitForTimeout(1000);

    // Captura 12: Ficha individual
    await saveDualScreenshot(oPage, '12-owner-ficha-vendedor.png');

    // Cerrar modal de ficha individual
    const closeFichaBtn = await oPage.waitForSelector('button:has-text("✕")', { timeout: 10000 });
    await closeFichaBtn.click();
    await oPage.waitForTimeout(600);

    // Abrir Revisión de Examen
    console.log('-> 10. Abriendo Revisión Pregunta por Pregunta...');
    const examBtn = await oPage.waitForSelector('text=🔍 Ver Examen', { timeout: 15000 });
    await examBtn.click();
    await oPage.waitForSelector('text=Revisión de Examen Completado', { timeout: 15000 });
    await oPage.waitForTimeout(1000);

    // Captura 13: Revisión de examen
    await saveDualScreenshot(oPage, '13-owner-revision-pregunta.png');

    // Cerrar modal de revisión
    const closeExamBtn = await oPage.waitForSelector('button:has-text("✕")', { timeout: 10000 });
    await closeExamBtn.click();
    await oPage.waitForTimeout(600);

    // Abrir Cajón de Notificaciones
    console.log('-> 11. Abriendo Drawer de Notificaciones...');
    const notifBtn = await oPage.waitForSelector('button:has-text("🔔 Notificaciones")', { timeout: 15000 });
    await notifBtn.click();
    await oPage.waitForSelector('text=Notificaciones de Capacitación', { timeout: 15000 });
    await oPage.waitForTimeout(1000);

    // Captura 14: Notificaciones drawer
    await saveDualScreenshot(oPage, '14-owner-notificaciones-drawer.png');
    await oContext.close();

    console.log('\n✅ TODAS LAS CAPTURAS VISUALES DE ACADEMY 3.0 COMPLETADAS CON ÉXITO.');
    await browser.close();
    server.close();
    await env.stop();
    process.exit(0);
} catch (err) {
    console.error('FALLO EN VERIFICACIÓN VISUAL PLAYWRIGHT:', err);
    if (browser) await browser.close();
    server.close();
    await env.stop();
    process.exit(1);
}