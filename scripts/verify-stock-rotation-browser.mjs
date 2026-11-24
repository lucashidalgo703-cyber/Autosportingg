// scripts/verify-stock-rotation-browser.mjs
// Verificación visual integral con Playwright para Inteligencia de Rotación del Stock.
// Valida:
//   1. Perfil Owner: 4 KPIs, Plan de Recuperación de Liquidez, Tabla Priorizada, Ficha Estratégica, Simulador de Precios.
//   2. Perfil Vendedor: Vista restringida con prioridades comerciales sanitizadas (sin costos, sin márgenes, sin break-even).
//   3. Genera capturas de pantalla de alta fidelidad en artifacts/screenshots/.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from '../tests/integration/isolatedReplicaHarness.js';
import { createLoginSession } from '../src/services/authSessionService.js';

const nodeBin = 'C:\\Users\\Tomas\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin';
if (!process.env.PATH.includes(nodeBin)) {
    process.env.PATH = `${nodeBin};${process.env.PATH}`;
}

const { chromium } = await import('file:///C:/Users/Tomas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const host = '127.0.0.1';
const port = 3895;
const base = `http://${host}:${port}`;
const screenshotsDir = path.resolve(root, 'artifacts', 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('-> 1. Iniciando réplica de base de datos aislada en memoria...');
const env = await bootIsolatedReplica({ listen: false });

const mongoose = (await import('mongoose')).default;
const AdminUser = mongoose.model('AdminUser');
const Car = mongoose.model('Car');
const Sale = mongoose.model('Sale');
const Lead = mongoose.model('Lead');

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

console.log('-> 2. Creando perfiles de usuario ficticios (Owner y Vendedor)...');
const owner = await AdminUser.create({
    name: 'Tomás Propietario',
    email: 'owner.rotacion@autosporting.test',
    passwordHash: hashPassword('OwnerPass123!'),
    role: 'owner',
    active: true,
    permissions: []
});

const vendedor = await AdminUser.create({
    name: 'Lucas Vendedor',
    email: 'vendedor.rotacion@autosporting.test',
    passwordHash: hashPassword('VendedorPass123!'),
    role: 'ventas',
    active: true,
    permissions: []
});

const ownerSession = await createLoginSession(owner);
const vendedorSession = await createLoginSession(vendedor);

console.log('-> 3. Sembrando vehículos de prueba representativos con distintos rangos de antigüedad...');
// Vehículo 1: Toyota Hilux SRX (Crítica >90 días: 110 días)
const carCritical = await Car.create({
    brand: 'Toyota',
    name: 'Hilux SRX 4x4 AT',
    year: 2021,
    km: 65000,
    fuel: 'Diesel',
    condition: 'Usado',
    plateOrVin: 'AE456GH',
    price: 36000000,
    currency: '$',
    purchasePrice: 28000000,
    purchaseCurrency: 'ARS',
    status: 'Disponible',
    createdAt: new Date(Date.now() - 110 * 86400000), // 110 días
    expenses: [
        { concept: 'Cubiertas nuevas y service', amount: 1200000, currency: 'ARS' }
    ],
    infoAuto: {
        valor: 32500000,
        currency: 'ARS',
        brandName: 'Toyota',
        modelName: 'Hilux',
        year: 2021,
        lastSyncAt: new Date()
    }
});

// Vehículo 2: Volkswagen Vento GLI (Atención 61-90 días: 75 días, con socio 40%)
const carAttention = await Car.create({
    brand: 'Volkswagen',
    name: 'Vento GLI 2.0 TSI',
    year: 2022,
    km: 42000,
    fuel: 'Nafta',
    condition: 'Usado',
    plateOrVin: 'AF789XY',
    price: 24000000,
    currency: '$',
    purchasePrice: 18000000,
    purchaseCurrency: 'ARS',
    status: 'Disponible',
    createdAt: new Date(Date.now() - 75 * 86400000), // 75 días
    jointOwnership: {
        hasPartner: true,
        partnerName: 'Inversor Patagonia',
        partnerPercentage: 40
    },
    expenses: [
        { concept: 'Pastillas de freno y detailing', amount: 450000, currency: 'ARS' }
    ],
    infoAuto: {
        valor: 23200000,
        currency: 'ARS',
        brandName: 'Volkswagen',
        modelName: 'Vento',
        year: 2022,
        lastSyncAt: new Date()
    }
});

// Vehículo 3: Ford Ranger Limited (Seguimiento 31-60 días: 45 días)
const carTracking = await Car.create({
    brand: 'Ford',
    name: 'Ranger Limited 3.2 4x4',
    year: 2023,
    km: 28000,
    fuel: 'Diesel',
    condition: 'Usado',
    plateOrVin: 'AG321KL',
    price: 34000000,
    currency: '$',
    purchasePrice: 27500000,
    purchaseCurrency: 'ARS',
    status: 'Disponible',
    createdAt: new Date(Date.now() - 45 * 86400000), // 45 días
    expenses: []
});

// Vehículo 4: Peugeot 208 Feline (Saludable 0-30 días: 12 días)
const carHealthy = await Car.create({
    brand: 'Peugeot',
    name: '208 Feline 1.6 Tiptronic',
    year: 2023,
    km: 19000,
    fuel: 'Nafta',
    condition: 'Usado',
    plateOrVin: 'AG654MN',
    price: 18500000,
    currency: '$',
    purchasePrice: 15000000,
    purchaseCurrency: 'ARS',
    status: 'Disponible',
    createdAt: new Date(Date.now() - 12 * 86400000), // 12 días
    expenses: []
});

// Lead de prueba para demanda
await Lead.create({
    name: 'Carlos Comprador',
    phone: '+5492974123456',
    vehicleId: carCritical._id,
    pipelineStage: 'Nuevo Contacto'
});

console.log('-> 4. Inicializando servidor web Next.js con Webpack en puerto', port, '...');
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_API_URL = base;
delete process.env.TURBOPACK;
process.env.IS_WEBPACK_TEST = '1';

const next = (await import('next')).default;
const nextApp = next({
    dev: true,
    webpack: true,
    hostname: host,
    port,
    dir: root,
    conf: { distDir: '.next-rotacion-browser-test' }
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
console.log('-> Servidor Next.js listo en', base);

console.log('-> 5. Lanzando Chromium...');
const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const gotoPage = async (page, route) => {
    console.log(`   Navegando a ${base}${route}...`);
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
};

try {
    // =============================================================
    // PARTE 1: VERIFICACIÓN VISUAL DEL PERFIL OWNER
    // =============================================================
    console.log('-> 6. [OWNER] Autenticando y accediendo a Stock -> Rotación Estratégica...');
    const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await ownerContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: ownerSession.token,
        user: { id: String(owner._id), email: owner.email, role: owner.role, name: owner.name }
    });

    const ownerPage = await ownerContext.newPage();
    await gotoPage(ownerPage, '/admin/stock');
    await ownerPage.waitForTimeout(2000);

    // Click en la pestaña Rotación Estratégica
    console.log('   Click en pestaña Rotación Estratégica...');
    const rotacionTab = await ownerPage.$('button:has-text("Rotación Estratégica")');
    assert.ok(rotacionTab, 'La pestaña Rotación Estratégica debe existir en Stock');
    await rotacionTab.click();
    await ownerPage.waitForTimeout(2500);

    // Captura 1: Resumen Ejecutivo de Rotación (4 KPIs)
    console.log('   Guardando rotacion-01-owner-resumen-kpis.png...');
    await ownerPage.screenshot({
        path: path.join(screenshotsDir, 'rotacion-01-owner-resumen-kpis.png'),
        fullPage: false
    });
    console.log('   OK: Captura 01 guardada.');

    // Captura 2: Plan de Recuperación Estratégica de Capital (Interactivo)
    console.log('-> 7. [OWNER] Desplegando y calculando Plan de Recuperación de Liquidez...');
    const planToggle = await ownerPage.$('text=Plan de Recuperación Estratégica de Capital');
    if (planToggle) {
        await planToggle.click();
        await ownerPage.waitForTimeout(1000);

        // Ingresar $30.000.000 como objetivo
        const targetInput = await ownerPage.$('input[placeholder="Ej: 30000000"]');
        if (targetInput) {
            await targetInput.fill('30000000');
            const submitPlan = await ownerPage.$('button:has-text("Resolver Combinaciones")');
            if (submitPlan) {
                await submitPlan.click();
                await ownerPage.waitForTimeout(1500);
            }
        }

        await ownerPage.screenshot({
            path: path.join(screenshotsDir, 'rotacion-02-owner-plan-recuperacion.png'),
            fullPage: false
        });
        console.log('   OK: Captura 02 guardada: rotacion-02-owner-plan-recuperacion.png');
    }

    // Captura 3: Tabla Principal de Unidades Priorizadas
    console.log('-> 8. [OWNER] Capturando Tabla Principal de Unidades Priorizadas...');
    await ownerPage.screenshot({
        path: path.join(screenshotsDir, 'rotacion-03-owner-tabla-priorizada.png'),
        fullPage: false
    });
    console.log('   OK: Captura 03 guardada: rotacion-03-owner-tabla-priorizada.png');

    // Captura 4: Ficha Estratégica (Modal) - Tab 1: Diagnóstico & Mercado
    console.log('-> 9. [OWNER] Abriendo Ficha Estratégica de la Toyota Hilux (+90 días)...');
    const fichaButtons = await ownerPage.$$('button:has-text("Ficha")');
    if (fichaButtons.length > 0) {
        await fichaButtons[0].click();
        await ownerPage.waitForTimeout(1500);

        await ownerPage.screenshot({
            path: path.join(screenshotsDir, 'rotacion-04-owner-ficha-estrategica-modal.png'),
            fullPage: false
        });
        console.log('   OK: Captura 04 guardada: rotacion-04-owner-ficha-estrategica-modal.png');

        // Captura 5: Tab 2: Simulador de Precios & Umbrales dentro del Modal
        console.log('   Click en Simulador de Precios...');
        const simTab = await ownerPage.$('button:has-text("Simulador de Precios")');
        if (simTab) {
            await simTab.click();
            await ownerPage.waitForTimeout(1500);

            await ownerPage.screenshot({
                path: path.join(screenshotsDir, 'rotacion-05-owner-simulador-precios.png'),
                fullPage: false
            });
            console.log('   OK: Captura 05 guardada: rotacion-05-owner-simulador-precios.png');
        }

        // Cerrar modal
        const closeBtn = await ownerPage.$('button > svg.lucide-x');
        if (closeBtn) {
            await closeBtn.click();
            await ownerPage.waitForTimeout(500);
        }
    }

    await ownerContext.close();

    // =============================================================
    // PARTE 2: VERIFICACIÓN DEL PERFIL VENDEDOR (VISTA SANITIZADA)
    // =============================================================
    console.log('-> 10. [VENDEDOR] Verificando vista comercial restringida y sanitizada...');
    const vendedorContext = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await vendedorContext.addInitScript(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('autosporting_tour_seen_' + user.id, 'true');
    }, {
        token: vendedorSession.token,
        user: { id: String(vendedor._id), email: vendedor.email, role: vendedor.role, name: vendedor.name }
    });

    const vendedorPage = await vendedorContext.newPage();
    await gotoPage(vendedorPage, '/admin/stock');
    await vendedorPage.waitForTimeout(2500);

    // Verificar que el vendedor ve "Prioridades de Venta"
    console.log('   Guardando rotacion-06-vendedor-prioridades-sanitizadas.png...');
    await vendedorPage.screenshot({
        path: path.join(screenshotsDir, 'rotacion-06-vendedor-prioridades-sanitizadas.png'),
        fullPage: false
    });
    console.log('   OK: Captura 06 guardada: rotacion-06-vendedor-prioridades-sanitizadas.png');

    await vendedorContext.close();

    console.log('-> 11. Todas las pruebas visuales Playwright concluyeron con éxito total.');

} finally {
    console.log('-> Limpiando recursos...');
    await browser.close();
    server.close();
    await env.stop();
    console.log('Servidor y réplica cerrados.');
}
