// Real Next/Express UI with temporary MongoDB and synthetic staff only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.VEHICLE_INVOICES_QA_PORT || 3203), base = `http://${host}:${port}`;
const output = path.resolve('../../outputs/facturacion-dominio'); fs.mkdirSync(output, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const env = await bootIsolatedReplica({ listen: false }), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/, 'Only isolated loopback services may be contacted');
    return originalFetch(input, options);
};
let nextApp, server, browser, failure, passed = 0, group = 0;
const contexts = [], errors = [], start = Math.max(1, Number(process.env.QA_START_GROUP) || 1);
const selectedGroups = process.env.QA_GROUPS ? new Set(process.env.QA_GROUPS.split(',').map(Number)) : null;
const test = async (name, callback) => { if (++group < start || selectedGroups && !selectedGroups.has(group)) { console.log(`skip ${group} - ${name}`); return; } await callback(); console.log(`ok ${++passed} - ${name}`); };
try {
    const { seedVehicleInvoices, invoicePdf, invoiceJpeg } = await import('../fixtures/vehicleInvoicesFixtures.js');
    const f = await seedVehicleInvoices(env.models);
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_API_URL = base; delete process.env.TURBOPACK;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-vehicle-invoices-qa' } });
    await nextApp.prepare(); const nextHandler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        const pathname = new URL(request.url, base).pathname;
        if (pathname.startsWith('/api/') && !/^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(pathname)) return env.app(request, response);
        void nextHandler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error en prueba aislada.'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    // Cold development compilation can take longer than an API assertion. Warm
    // this page before starting browser expectations so those measure the CRM.
    const warmed = await fetch(base + '/admin/facturacion', { signal: AbortSignal.timeout(180000) });
    assert.equal(warmed.status, 200);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
    const goto = async (page, route) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try { return await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 }); }
            catch (error) { if (attempt === 2 || !String(error.message).includes('net::ERR_ABORTED') || page.isClosed()) throw error; await page.waitForTimeout(300); }
        }
    };
    async function surface(index, width = 1440) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' }); contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ token, id }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); },
            { token: f.sessions[index].token, id: String(f.users[index]._id) });
        const page = await context.newPage(); page.setDefaultTimeout(45000);
        const responses = []; page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api')) responses.push({ path: new URL(response.url()).pathname, status: response.status() }); });
        page.on('pageerror', error => errors.push(error.message));
        return { page, context, responses, index, token: f.sessions[index].token };
    }
    const auth = async current => {
        assert.equal(await current.page.evaluate(() => localStorage.getItem('token')), current.token);
        assert.equal((await current.page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + current.token } })).status(), 200);
        assert.ok(!new URL(current.page.url()).pathname.startsWith('/login'));
    };
    const capture = async (page, name) => {
        await page.evaluate(() => document.fonts.ready); await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'Mobile page fits its viewport');
        await page.screenshot({ path: path.join(output, name), fullPage: false });
    };
    const invoiceResponse = response => new URL(response.url()).pathname === '/api/admin/vehicle-invoices' && response.request().method() === 'POST';

    await test('owner and Maia can register existing sales/purchase invoices using their original vehicle and currency on desktop and mobile', async () => {
        for (const [index, width, direction, number] of [[1, 1440, 'sale', '100'], [3, 390, 'purchase', '200']]) {
            const current = await surface(index, width), page = current.page;
            const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/vehicle-invoices' && response.request().method() === 'GET');
            await goto(page, '/admin/facturacion'); assert.equal((await loaded).status(), 200);
            await page.getByRole('heading', { name: 'Facturación / ARCA', exact: true }).waitFor();
            await page.getByRole('button', { name: direction === 'sale' ? 'Emitidas · Ventas' : 'Recibidas · Compras', exact: true }).click();
            await page.getByRole('button', { name: 'Registrar factura', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Registrar factura', exact: true }); await dialog.waitFor();
            await dialog.getByLabel('Buscar operación', { exact: true }).fill(direction === 'sale' ? 'QAVENTA1' : 'Compra facturación');
            const operation = dialog.getByRole('button').filter({ hasText: direction === 'sale' ? /Compra propia A/ : /Compra facturación QA/ }).first();
            await operation.click();
            await dialog.getByLabel('Tipo de factura', { exact: true }).selectOption(direction === 'sale' ? 'A' : 'B');
            await dialog.getByLabel('Punto de venta', { exact: true }).fill('1');
            await dialog.getByLabel('Número de factura', { exact: true }).fill(number);
            await dialog.getByLabel('Fecha de factura', { exact: true }).fill('2026-11-19');
            await dialog.getByLabel('Importe total', { exact: true }).fill(direction === 'sale' ? '20000000' : '14000');
            assert.equal(await dialog.getByLabel('Moneda', { exact: true }).inputValue(), direction === 'sale' ? 'ARS' : 'USD');
            await dialog.getByLabel('Nombre / razón social', { exact: true }).fill(direction === 'sale' ? 'Comprador A QA' : 'Proveedor ficticio QA');
            await dialog.getByLabel('CUIT / identificación fiscal', { exact: true }).fill(direction === 'sale' ? '20123456789' : '30987654321');
            await dialog.getByLabel('Archivo de la factura', { exact: true }).setInputFiles(width < 768
                ? { name: 'factura-qa.JPEG', mimeType: '', buffer: invoiceJpeg }
                : { name: 'factura-qa.pdf', mimeType: 'application/pdf', buffer: invoicePdf });
            const saved = page.waitForResponse(invoiceResponse); await dialog.getByRole('button', { name: 'Guardar factura', exact: true }).click();
            assert.ok([200, 201].includes((await saved).status())); await dialog.waitFor({ state: 'hidden' });
            const cards = page.locator('[data-invoice-id]'); await cards.first().waitFor();
            await page.waitForFunction(() => [...document.querySelectorAll('[data-invoice-id]')].some(element => /PDF adjunto|Imagen adjunta/.test(element.textContent)));
            await auth(current); assert.deepEqual(current.responses.filter(response => [401, 403].includes(response.status)), []);
            await capture(page, index === 1 ? 'facturacion-propietario-escritorio.png' : 'facturacion-maia-celular.png');
            console.log(`QA: invoice ${direction} registered from ${width < 768 ? 'mobile' : 'desktop'} without finance mutations.`);
        }
    });
    await test('Maia can preview and replace a PDF or image inside the CRM, download it and annul a registration', async () => {
        // This group is independent so it can be resumed after a development compiler navigation abort.
        const current = await surface(3, 390), page = current.page;
        const input = { direction: 'purchase', carId: f.emptyPlateId, invoiceType: 'B', pointOfSale: '3', invoiceNumber: '300', invoiceDate: '2026-11-19', totalAmount: 14000, currency: 'USD', partyName: 'Proveedor adjuntos QA', partyTaxId: '30765432109' };
        const created = await page.request.post(base + '/api/admin/vehicle-invoices', { headers: { Authorization: 'Bearer ' + current.token, 'Idempotency-Key': crypto.randomUUID() }, data: input });
        assert.equal(created.status(), 201); const invoice = (await created.json()).invoice;
        const uploaded = await page.request.post(base + '/api/admin/vehicle-invoices/' + invoice.id + '/file', { headers: { Authorization: 'Bearer ' + current.token, 'Idempotency-Key': crypto.randomUUID() }, multipart: { revision: String(invoice.revision), file: { name: 'factura.pdf', mimeType: 'application/pdf', buffer: invoicePdf } } });
        assert.ok([200, 201].includes(uploaded.status()));
        await goto(page, '/admin/facturacion'); await page.getByRole('button', { name: 'Recibidas · Compras', exact: true }).click();
        const row = page.locator(`[data-invoice-id="${invoice.id}"]`); await row.waitFor();
        const pdfRead = page.waitForResponse(response => new URL(response.url()).pathname.startsWith('/api/vehicle-invoice-files/') && response.request().method() === 'GET');
        await row.getByRole('button', { name: /Ver archivo|Ver factura|Vista previa/i }).click();
        const preview = page.getByRole('dialog').last(); await preview.waitFor();
        assert.equal((await pdfRead).status(), 200); await preview.locator('[data-private-document-pdf]').waitFor();
        assert.equal(current.context.pages().length, 1); await auth(current);
        await preview.getByRole('button', { name: /Cerrar/i }).last().click();
        const downloaded = page.waitForEvent('download'); await row.getByRole('button', { name: /Descargar/i }).click(); assert.ok((await downloaded).suggestedFilename());
        await row.getByRole('button', { name: /Reemplazar archivo/i }).click();
        const replace = page.getByRole('dialog', { name: 'Reemplazar archivo', exact: true });
        const png = Buffer.from(await page.evaluate(() => {
            const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 800;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 800);
            ctx.fillStyle = '#e52629'; ctx.fillRect(0, 0, 600, 115); ctx.fillStyle = '#fff'; ctx.font = 'bold 35px sans-serif'; ctx.fillText('AUTOSPORTING', 35, 70);
            ctx.fillStyle = '#151515'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('FACTURA DE PRUEBA', 35, 180);
            ctx.font = '20px sans-serif'; for (const [index, line] of ['DOCUMENTO FICTICIO QA', 'Compra de vehiculo', 'Moneda: USD', 'Importe: 14.000', 'Solo para verificar la vista previa'].entries()) ctx.fillText(line, 35, 250 + index * 55);
            return canvas.toDataURL('image/png').split(',')[1];
        }), 'base64');
        await replace.getByLabel('Archivo de la factura', { exact: true }).setInputFiles({ name: 'factura-qa.png', mimeType: 'image/png', buffer: png });
        await replace.getByLabel('Archivo de la factura', { exact: true }).setInputFiles({ name: 'archivo-incorrecto.txt', mimeType: 'text/plain', buffer: Buffer.from('no es una factura') });
        await replace.getByRole('alert').getByText('Elegí un PDF o una imagen JPG, PNG o WebP.', { exact: true }).waitFor();
        assert.equal(await replace.getByRole('button', { name: 'Subir archivo', exact: true }).isDisabled(), true, 'An invalid reselection clears the previous invoice attachment');
        assert.equal(await replace.getByText(/factura-qa.png ·/).count(), 0);
        await replace.getByLabel('Archivo de la factura', { exact: true }).setInputFiles({ name: 'factura-qa.png', mimeType: 'image/png', buffer: png });
        const response = page.waitForResponse(value => /\/file$/.test(new URL(value.url()).pathname) && value.request().method() === 'POST');
        await replace.getByRole('button', { name: 'Subir archivo', exact: true }).click(); assert.ok([200, 201].includes((await response).status())); await replace.waitFor({ state: 'hidden' });
        const imageRead = page.waitForResponse(value => new URL(value.url()).pathname.startsWith('/api/vehicle-invoice-files/') && value.request().method() === 'GET');
        await row.getByRole('button', { name: 'Ver factura', exact: true }).click(); assert.equal((await imageRead).status(), 200);
        const imagePreview = page.getByRole('dialog', { name: 'Visor de documento', exact: true }); await imagePreview.locator('[data-private-document-image]').waitFor();
        await page.waitForFunction(() => { const image = document.querySelector('[data-private-document-image]'); return image?.complete && image.naturalWidth === 600; });
        assert.equal(current.context.pages().length, 1); await capture(page, 'factura-vista-previa-celular.png');
        await imagePreview.getByRole('button', { name: 'Cerrar documento', exact: true }).click();
        await row.getByRole('button', { name: /Anular registro/i }).click();
        const annul = page.getByRole('dialog').last(); await annul.getByLabel(/Motivo/).fill('Comprobante ficticio incorrecto QA');
        await annul.getByRole('button', { name: 'Confirmar anulación', exact: true }).click(); await annul.waitFor({ state: 'hidden' });
        await auth(current);
    });
    await test('seller and administrator cannot open billing APIs or the billing form and keep their session', async () => {
        for (const index of [0, 2]) {
            const current = await surface(index, index === 2 ? 390 : 1440);
            await goto(current.page, '/admin/facturacion'); await current.page.waitForTimeout(300);
            assert.equal(await current.page.getByRole('button', { name: 'Registrar factura', exact: true }).count(), 0);
            assert.equal((await current.page.request.get(base + '/api/admin/vehicle-invoices', { headers: { Authorization: 'Bearer ' + current.token } })).status(), 403);
            await auth(current);
        }
    });
    await test('seller and Maia see and complete missing domains from Negotiation without opening the inventory', async () => {
        for (const [index, width, plate] of [[2, 1440, 'AB123CD'], [3, 390, 'AC123DE']]) {
            const car = await env.models.Car.create({ brand: 'DominioQA', name: 'Completar ' + index, year: 2024, km: 100, fuel: 'Nafta', condition: 'Usado', price: 20000,
                currency: 'USD', purchasePrice: 15000, purchaseCurrency: 'USD', agencyOwned: true, status: 'Disponible', visibleEnWeb: false });
            const current = await surface(index, width), page = current.page;
            await goto(page, '/admin/stock'); await page.locator('[data-stock-negotiation]').waitFor();
            const filtered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/stock/negotiation'
                && new URL(response.url()).searchParams.get('search') === 'Completar ' + index && response.request().method() === 'GET');
            await page.getByPlaceholder('Marca, modelo o dominio', { exact: true }).fill('Completar ' + index);
            assert.equal((await filtered).status(), 200);
            const row = page.locator(`[data-negotiation-${width < 1100 ? 'card' : 'row'}="${car._id}"]`); await row.waitFor();
            await row.getByRole('button', { name: 'Completar dominio', exact: true }).click();
            const form = page.locator(`[data-negotiation-plate="${car._id}"]`);
            await form.getByLabel(/Dominio|Patente/).fill(plate.toLowerCase());
            const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/stock/negotiation/' + car._id + '/plate' && response.request().method() === 'PATCH');
            await form.getByRole('button', { name: /Guardar dominio|Guardar patente/i }).click(); assert.equal((await saved).status(), 200);
            await row.getByText('Dominio: ' + plate, { exact: true }).waitFor(); assert.equal(await row.getByRole('button', { name: 'Completar dominio', exact: true }).count(), 0);
            assert.equal((await env.models.Car.findById(car._id).lean()).plateOrVin, plate); await auth(current);
            await capture(page, index === 3 ? 'dominio-negociacion-celular.png' : 'dominio-negociacion-escritorio.png');
            assert.equal(current.responses.some(response => response.path === '/api/admin/cars'), false);
        }
    });
    assert.deepEqual(errors.filter(message => !/net::ERR_ABORTED|Failed to fetch dynamically imported module|Loading chunk/.test(message)), []);
    console.log(`PASS: ${passed} vehicle billing and domain browser groups; temporary users and no production writes.`);
} catch (error) {
    failure = error;
    for (const [index, context] of contexts.entries()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'fallo-' + index + '.png') }).catch(() => {});
    console.error(error);
} finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (nextApp) await Promise.race([nextApp.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
    globalThis.fetch = originalFetch; await env.stop();
}
process.exit(failure ? 1 : 0);
