// scripts/verify-academy-browser.mjs
// Verificación visual en navegador Chromium (Playwright) de AutoSporting Academy 2.0 dentro del CRM.

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
const port = 3890;
const base = `http://${host}:${port}`;
const screenshotsDir = path.resolve(root, 'artifacts', 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('-> 1. Iniciando réplica aislada en memoria...');
const env = await bootIsolatedReplica({ listen: false });

const mongoose = (await import('mongoose')).default;
const AdminUser = mongoose.model('AdminUser');

// Hash helper
const crypto = (await import('node:crypto')).default;
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

console.log('-> 2. Creando perfiles de usuario ficticios...');
const owner = await AdminUser.create({
    name: 'Tomás Propietario',
    email: 'owner.academy@autosporting.test',
    passwordHash: hashPassword('OwnerPass123!'),
    role: 'owner',
    active: true,
    permissions: []
});

const vendedor = await AdminUser.create({
    name: 'Lucas Vendedor',
    email: 'vendedor.academy@autosporting.test',
    passwordHash: hashPassword('VendedorPass123!'),
    role: 'ventas',
    active: true,
    permissions: []
});

const gestoria = await AdminUser.create({
    name: 'Marta Gestora',
    email: 'gestoria.academy@autosporting.test',
    passwordHash: hashPassword('GestoriaPass123!'),
    role: 'gestoria_contabilidad',
    active: true,
    permissions: []
});

const adminFact = await AdminUser.create({
    name: 'Carlos Facturación',
    email: 'admin.academy@autosporting.test',
    passwordHash: hashPassword('AdminPass123!'),
    role: 'administrativo',
    active: true,
    permissions: []
});

const ownerSession = await createLoginSession(owner);
const vendedorSession = await createLoginSession(vendedor);
const gestoriaSession = await createLoginSession(gestoria);
const adminFactSession = await createLoginSession(adminFact);

console.log('-> 3. Preparando servidor Next.js en modo desarrollo...');
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

console.log('-> 4. Lanzando Chromium con Playwright...');
const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']
});

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
    // -------------------------------------------------------------
    // PRUEBA 1: VISTA DE VENDEDOR (Lucas Vendedor)
    // -------------------------------------------------------------
    console.log('-> 5. Verificando perfil Vendedor (/admin/academy)...');
    const vContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await vContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: vendedorSession.token,
        user: { id: String(vendedor._id), email: vendedor.email, role: vendedor.role, name: vendedor.name }
    });

    const vPage = await vContext.newPage();
    await gotoPage(vPage, '/admin/academy');
    await vPage.waitForSelector('text=AutoSporting Academy', { timeout: 60000 });
    console.log('   OK: Header de Academy cargado.');

    const vText = await vPage.textContent('body');
    assert.ok(vText.includes('Capacitación'), 'Debe mostrar texto de Capacitación');
    assert.ok(!vText.includes('Gestión de capacitación'), 'Vendedor NO debe ver pestaña de Gestión');

    await vPage.screenshot({ path: path.join(screenshotsDir, '01-vendedor-academy-home.png'), fullPage: true });
    console.log('   OK: Captura 01-vendedor-academy-home.png guardada.');

    // Navegar al Simulador de Negociación
    console.log('-> 6. Verificando Simulador de Negociación (/admin/academy/negociacion)...');
    await gotoPage(vPage, '/admin/academy/negociacion');
    await vPage.waitForSelector('text=Entrenamiento de Negociación', { timeout: 30000 });
    await vPage.screenshot({ path: path.join(screenshotsDir, '02-vendedor-simulador-negociacion.png'), fullPage: true });
    console.log('   OK: Captura 02-vendedor-simulador-negociacion.png guardada.');

    // Navegar a Aprender del Error
    console.log('-> 7. Verificando Aprender del Error (/admin/academy/aprender-del-error)...');
    await gotoPage(vPage, '/admin/academy/aprender-del-error');
    await vPage.waitForSelector('text=Espacio de Reflexión', { timeout: 30000 });
    await vPage.screenshot({ path: path.join(screenshotsDir, '03-vendedor-aprender-error.png'), fullPage: true });
    console.log('   OK: Captura 03-vendedor-aprender-error.png guardada.');

    await vContext.close();

    // -------------------------------------------------------------
    // PRUEBA 2: VISTA DE OWNER / ADMINISTRADOR (Tomás Propietario)
    // -------------------------------------------------------------
    console.log('-> 8. Verificando perfil Owner (/admin/academy)...');
    const oContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await oContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: ownerSession.token,
        user: { id: String(owner._id), email: owner.email, role: owner.role, name: owner.name }
    });

    const oPage = await oContext.newPage();
    await gotoPage(oPage, '/admin/academy');
    await oPage.waitForSelector('text=AutoSporting Academy', { timeout: 60000 });

    const oText = await oPage.textContent('body');
    assert.ok(oText.includes('Gestión de capacitación'), 'Owner DEBE ver pestaña de Gestión de capacitación');

    await oPage.screenshot({ path: path.join(screenshotsDir, '04-owner-academy-home.png'), fullPage: true });
    console.log('   OK: Captura 04-owner-academy-home.png guardada.');

    // Navegar a Gestión de Capacitación
    console.log('-> 9. Verificando Gestión de Capacitación (/admin/academy/gestion)...');
    await gotoPage(oPage, '/admin/academy/gestion');
    await oPage.waitForSelector('text=Supervisión Formativa', { timeout: 30000 });
    await oPage.screenshot({ path: path.join(screenshotsDir, '05-owner-gestion-capacitacion.png'), fullPage: true });
    console.log('   OK: Captura 05-owner-gestion-capacitacion.png guardada.');

    await oContext.close();

    // -------------------------------------------------------------
    // PRUEBA 3: VISTA DE GESTORÍA (Marta Gestora)
    // -------------------------------------------------------------
    console.log('-> 10. Verificando perfil Gestoría (/admin/academy)...');
    const gContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await gContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: gestoriaSession.token,
        user: { id: String(gestoria._id), email: gestoria.email, role: gestoria.role, name: gestoria.name }
    });

    const gPage = await gContext.newPage();
    await gotoPage(gPage, '/admin/academy');
    await gPage.waitForSelector('text=AutoSporting Academy', { timeout: 60000 });
    await gPage.screenshot({ path: path.join(screenshotsDir, '06-gestoria-academy-home.png'), fullPage: true });
    console.log('   OK: Captura 06-gestoria-academy-home.png guardada.');
    await gContext.close();

    // -------------------------------------------------------------
    // PRUEBA 4: VISTA DE ADMINISTRACIÓN Y FACTURACIÓN (Carlos Facturación)
    // -------------------------------------------------------------
    console.log('-> 11. Verificando perfil Administración (/admin/academy)...');
    const aContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await aContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: adminFactSession.token,
        user: { id: String(adminFact._id), email: adminFact.email, role: adminFact.role, name: adminFact.name }
    });

    const aPage = await aContext.newPage();
    await gotoPage(aPage, '/admin/academy');
    await aPage.waitForSelector('text=AutoSporting Academy', { timeout: 60000 });
    await aPage.screenshot({ path: path.join(screenshotsDir, '07-administracion-academy-home.png'), fullPage: true });
    console.log('   OK: Captura 07-administracion-academy-home.png guardada.');
    await aContext.close();

    console.log('\n=============================================================');
    console.log('VERIFICACIÓN COMPLETA EN NAVEGADOR DE LOS 4 ROLES EXITOSA.');
    console.log(`Capturas guardadas en: ${screenshotsDir}`);
    console.log('=============================================================');
} finally {
    await browser.close();
    server.close();
    process.exit(0);
}
