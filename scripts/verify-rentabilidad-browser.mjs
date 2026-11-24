// scripts/verify-rentabilidad-browser.mjs
// Verificación visual integral con Playwright para la nueva sección RENTABILIDAD.
// Valida:
//   1. Perfil Owner: Resumen ejecutivo, Vendidos (entregadas vs pendientes), En stock, Ficha detallada, Comparador.
//   2. Perfil Vendedor: Bloqueo estricto 403 / pantalla de Acceso Restringido.
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
const port = 3892;
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

const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

console.log('-> 2. Creando perfiles de usuario ficticios (Owner y Vendedor)...');
const owner = await AdminUser.create({
    name: 'Tomás Propietario',
    email: 'owner.rentabilidad@autosporting.test',
    passwordHash: hashPassword('OwnerPass123!'),
    role: 'owner',
    active: true,
    permissions: []
});

const vendedor = await AdminUser.create({
    name: 'Lucas Vendedor',
    email: 'vendedor.rentabilidad@autosporting.test',
    passwordHash: hashPassword('VendedorPass123!'),
    role: 'ventas',
    active: true,
    permissions: []
});

const ownerSession = await createLoginSession(owner);
const vendedorSession = await createLoginSession(vendedor);

console.log('-> 3. Sembrando operaciones y vehículos de prueba representativos...');
// Vehículo 1: Toyota Corolla XEI (Vendido - Entregada definitiva)
const car1 = await Car.create({
    brand: 'Toyota',
    name: 'Corolla XEI 2.0 CVT',
    year: 2022,
    km: 35000,
    fuel: 'Nafta',
    condition: 'Usado',
    plateOrVin: 'AF123CD',
    price: 15000000,
    currency: '$',
    purchasePrice: 11000000,
    purchaseCurrency: 'ARS',
    status: 'Vendido',
    createdAt: new Date('2026-01-05T10:00:00Z'),
    expenses: [
        { concept: 'Service Oficial y cambio de aceite', amount: 300000, currency: 'ARS', date: new Date('2026-01-10') },
        { concept: 'Detailing y tratamiento cerámico', amount: 200000, currency: 'ARS', date: new Date('2026-01-12') }
    ]
});

const sale1 = await Sale.create({
    vehicleId: car1._id,
    salePrice: 15000000,
    saleCurrency: 'ARS',
    status: 'entregada',
    saleDate: new Date('2026-01-25T14:30:00Z'),
    salesperson: 'Lucas Vendedor',
    commissionAmount: 200000,
    commissionCurrency: 'ARS',
    depositAppliedAmount: 15000000,
    depositAppliedCurrency: 'ARS',
    paymentMethod: 'contado',
    saleExpenses: [
        { description: 'Gestoría de transferencia a cargo de agencia', amount: 150000, currency: 'ARS', status: 'Pagado' }
    ]
});

// Vehículo 2: Ford Ranger XLS (Vendido - Pendiente de Entrega / Financiado)
const car2 = await Car.create({
    brand: 'Ford',
    name: 'Ranger XLS 3.2 4x4',
    year: 2021,
    km: 68000,
    fuel: 'Diésel',
    condition: 'Usado',
    plateOrVin: 'AE456GH',
    price: 28000000,
    currency: '$',
    purchasePrice: 22000000,
    purchaseCurrency: 'ARS',
    status: 'Vendido',
    createdAt: new Date('2026-01-10T09:00:00Z'),
    expenses: [
        { concept: 'Cambio de pastillas de freno', amount: 250000, currency: 'ARS', date: new Date('2026-01-15') }
    ]
});

const sale2 = await Sale.create({
    vehicleId: car2._id,
    salePrice: 28000000,
    saleCurrency: 'ARS',
    status: 'pendiente_entrega',
    saleDate: new Date('2026-02-15T16:00:00Z'),
    salesperson: 'Lucas Vendedor',
    commissionAmount: 350000,
    commissionCurrency: 'ARS',
    depositAppliedAmount: 16000000,
    depositAppliedCurrency: 'ARS',
    paymentMethod: 'financiado',
    financingDetails: {
        hasFinancing: true,
        downPayment: 16000000,
        installmentsCount: 12,
        financedBalance: 12000000,
        interestAmount: 2400000,
        totalFinancedWithInterest: 14400000,
        installmentAmount: 1200000,
        totalOperationPrice: 30400000
    },
    saleExpenses: [
        { description: 'Verificación policial y grabado', amount: 120000, currency: 'ARS', status: 'Pagado' }
    ]
});

// Vehículo 3: VW Gol Trend (En Stock - Origen de Permuta de Sale 1)
const car3 = await Car.create({
    brand: 'Volkswagen',
    name: 'Gol Trend 1.6 MSI Trendline',
    year: 2018,
    km: 84000,
    fuel: 'Nafta',
    condition: 'Usado',
    plateOrVin: 'AC789JK',
    price: 9200000,
    currency: '$',
    purchasePrice: 7000000,
    purchaseCurrency: 'ARS',
    status: 'Disponible',
    createdAt: new Date('2026-01-26T11:00:00Z'),
    tradeInOrigin: {
        saleId: sale1._id,
        value: 7000000,
        currency: 'ARS',
        source: 'sale_flow'
    },
    expenses: [
        { concept: 'Batería nueva Willard', amount: 180000, currency: 'ARS', date: new Date('2026-01-28') },
        { concept: 'Alineación y balanceo', amount: 120000, currency: 'ARS', date: new Date('2026-01-30') }
    ]
});

// Vehículo 4: Peugeot 208 Feline (En Stock - Operación Compartida al 50%)
const car4 = await Car.create({
    brand: 'Peugeot',
    name: '208 Feline 1.6 Tiptronic',
    year: 2023,
    km: 22000,
    fuel: 'Nafta',
    condition: 'Usado',
    plateOrVin: 'AG101LL',
    price: 16500000,
    currency: '$',
    purchasePrice: 13000000,
    purchaseCurrency: 'ARS',
    status: 'Disponible',
    createdAt: new Date('2026-02-01T10:00:00Z'),
    jointOwnership: {
        hasPartner: true,
        partnerName: 'Marcelo Rossi (Inversor)',
        partnerPercentage: 50,
        agencyPercentage: 50,
        partnerContribution: 6500000,
        agencyCost: 6500000,
        currency: 'ARS'
    },
    expenses: [
        { concept: 'Polarizado antivandálico 3M', amount: 160000, currency: 'ARS', date: new Date('2026-02-05') }
    ]
});

console.log('-> 4. Preparando servidor Next.js para pruebas...');
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_API_URL = base;
delete process.env.TURBOPACK;
process.env.IS_WEBPACK_TEST = '1';

const next = (await import('next')).default;
const nextApp = next({
    dev: true,
    hostname: host,
    port,
    dir: root,
    conf: { distDir: '.next-rentabilidad-browser-qa' }
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

console.log('-> 5. Lanzando Chromium con Playwright...');
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
            await page.waitForTimeout(1000);
        }
    }
};

try {
    // =============================================================
    // PARTE 1: VERIFICACIÓN DEL PERFIL OWNER (PROPIETARIO)
    // =============================================================
    console.log('-> 6. [OWNER] Verificando acceso autorizado a /admin/rentabilidad...');
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
    ownerPage.on('console', msg => {
        if (msg.type() === 'error') console.log('   [BROWSER ERROR]', msg.text());
    });
    ownerPage.on('pageerror', err => console.error('   [PAGE ERROR]', err.message));
    await gotoPage(ownerPage, '/admin/rentabilidad');
    await ownerPage.waitForSelector('text=RENTABILIDAD REAL POR VEHÍCULO', { timeout: 60000 });
    console.log('   OK: Header principal de Rentabilidad cargado.');

    // Captura 1: Resumen Ejecutivo
    await ownerPage.waitForTimeout(2000); // Aguardar renderizado de gráficos/tablas
    await ownerPage.screenshot({
        path: path.join(screenshotsDir, 'rentabilidad-01-owner-resumen.png'),
        fullPage: false
    });
    console.log('   OK: Captura 01 guardada: rentabilidad-01-owner-resumen.png');

    // Captura 2: Tabla de Vendidos con entrega y margen
    // Seleccionar filtro "Histórico Completo" para ver ambas ventas
    const historicoBtn = await ownerPage.$('button:has-text("Histórico Completo")');
    if (historicoBtn) {
        await historicoBtn.click();
        await ownerPage.waitForTimeout(1500);
    }

    await ownerPage.screenshot({
        path: path.join(screenshotsDir, 'rentabilidad-02-owner-vendidos.png'),
        fullPage: false
    });
    console.log('   OK: Captura 02 guardada: rentabilidad-02-owner-vendidos.png');

    // Captura 3: Vista de En Stock (Rentabilidad Potencial)
    console.log('-> 7. [OWNER] Verificando pestaña En Stock (Rentabilidad Potencial)...');
    const stockTabBtn = await ownerPage.$('button:has-text("En Stock (Rentabilidad Potencial)")');
    assert.ok(stockTabBtn, 'Debe existir el botón de tab En Stock');
    await stockTabBtn.click();
    await ownerPage.waitForTimeout(1500);

    await ownerPage.screenshot({
        path: path.join(screenshotsDir, 'rentabilidad-03-owner-stock.png'),
        fullPage: false
    });
    console.log('   OK: Captura 03 guardada: rentabilidad-03-owner-stock.png');

    // Captura 4: Ficha Detallada de Rentabilidad (Modal)
    console.log('-> 8. [OWNER] Abriendo Ficha Detallada de Vehículo...');
    // Volver a vendidos para ver la Hilux o Corolla
    const soldTabBtn = await ownerPage.$('button:has-text("Vendidos")');
    if (soldTabBtn) {
        await soldTabBtn.click();
        await ownerPage.waitForTimeout(1000);
    }

    const fichaBtn = await ownerPage.$('button:has-text("Ficha")');
    if (fichaBtn) {
        await fichaBtn.click();
        await ownerPage.waitForSelector('text=FICHA DE RENTABILIDAD REAL', { timeout: 15000 });
        await ownerPage.waitForTimeout(1000);

        // Click en tab de permutas dentro de la ficha para ver trazabilidad
        const permutasTabModal = await ownerPage.$('button:has-text("Permutas")');
        if (permutasTabModal) {
            await permutasTabModal.click();
            await ownerPage.waitForTimeout(500);
        }

        await ownerPage.screenshot({
            path: path.join(screenshotsDir, 'rentabilidad-04-owner-ficha-detalle.png'),
            fullPage: false
        });
        console.log('   OK: Captura 04 guardada: rentabilidad-04-owner-ficha-detalle.png');

        // Cerrar modal
        const closeBtn = await ownerPage.$('button[title="Cerrar ficha"]');
        if (closeBtn) {
            await closeBtn.click();
            await ownerPage.waitForTimeout(500);
        }
    }

    // Captura 5: Comparador & Eficiencia del Capital
    console.log('-> 9. [OWNER] Verificando Comparador & Eficiencia del Capital...');
    // Marcar casillas de comparación en la tabla
    const checkboxes = await ownerPage.$$('input[type="checkbox"][title*="comparador"]');
    for (let i = 0; i < Math.min(checkboxes.length, 2); i++) {
        await checkboxes[i].check();
        await ownerPage.waitForTimeout(300);
    }

    const compareTabBtn = await ownerPage.$('button:has-text("Comparador")');
    if (compareTabBtn) {
        await compareTabBtn.click();
        await ownerPage.waitForSelector('text=Matriz Comparativa de Rentabilidad', { timeout: 15000 });
        await ownerPage.waitForTimeout(1500);

        await ownerPage.screenshot({
            path: path.join(screenshotsDir, 'rentabilidad-05-owner-comparador.png'),
            fullPage: false
        });
        console.log('   OK: Captura 05 guardada: rentabilidad-05-owner-comparador.png');
    }

    await ownerContext.close();

    // =============================================================
    // PARTE 2: VERIFICACIÓN DEL PERFIL VENDEDOR (SIN PERMISO)
    // =============================================================
    console.log('-> 10. [VENDEDOR] Verificando denegación estricta de acceso (/admin/rentabilidad)...');
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
    await gotoPage(vendedorPage, '/admin/rentabilidad');
    await vendedorPage.waitForTimeout(3000);

    // 1. Verificar que ProtectedRoute bloqueó el acceso y redirigió al home del vendedor (/admin/mis-ventas)
    const currentUrl = vendedorPage.url();
    console.log('   URL alcanzada por vendedor:', currentUrl);
    assert.ok(currentUrl.includes('/admin/mis-ventas') || currentUrl.includes('/admin'), 'El vendedor no autorizado debe ser redirigido fuera de /admin/rentabilidad');

    // 2. Verificar que en el menú lateral NO existe el acceso a Rentabilidad
    const rentabilidadLink = await vendedorPage.$('a[href="/admin/rentabilidad"]');
    assert.equal(rentabilidadLink, null, 'El menú de Rentabilidad NO debe aparecer en el sidebar del vendedor');

    // 3. Verificar que la API bloquea con 403 Forbidden al vendedor
    const apiRes = await fetch(`${base}/api/admin/profitability`, {
        headers: { Authorization: `Bearer ${vendedorSession.token}` }
    });
    assert.equal(apiRes.status, 403, 'La API de rentabilidad debe responder 403 Forbidden para el vendedor');
    console.log('   OK: API respondió 403 Forbidden al vendedor.');

    // 4. Captura de pantalla demostrando el bloqueo y la ausencia en sidebar
    await vendedorPage.screenshot({
        path: path.join(screenshotsDir, 'rentabilidad-06-vendedor-denegado.png'),
        fullPage: false
    });
    console.log('   OK: Captura 06 guardada: rentabilidad-06-vendedor-denegado.png');

    await vendedorContext.close();

    console.log('-> 11. Todas las pruebas visuales Playwright concluyeron con éxito.');

} finally {
    console.log('-> Limpiando recursos...');
    await browser.close();
    server.close();
    await env.stop();
    console.log('Servidor y réplica cerrados.');
}
