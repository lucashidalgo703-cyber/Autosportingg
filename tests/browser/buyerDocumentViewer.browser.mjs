// Disposable buyers, files and mailbox only. Start start-review-preview.js first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/visor-documentos');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [];
let lastPage;
const modalSelector = '[data-private-document-viewer]';
const imageSelector = '[data-private-document-image]';
const pdfSelector = '[data-private-document-pdf]';
async function newContext(options = {}) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...options });
    contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    return context;
}
const goto = (page, url) => page.goto(new URL(url, base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
const responseFor = (page, suffix, method) => {
    const promise = page.waitForResponse(response => response.url().endsWith(suffix) && response.request().method() === method);
    promise.catch(() => {}); return promise;
};
function pdfFixture() {
    const content = 'q 0.1 0.2 0.65 RG 8 w 20 20 360 260 re S Q\nBT /F1 17 Tf 40 150 Td (DOCUMENTO FICTICIO - VISOR INTERNO) Tj ET\n';
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    let text = '%PDF-1.4\n'; const offsets = [];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(text)); text += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(text);
    text += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map(value => String(value).padStart(10, '0') + ' 00000 n \n').join('')
        + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(text);
}
async function borderedPhoto(page, width, height, label) {
    const data = await page.evaluate(({ width, height, label }) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#eef2ff'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#db2727'; ctx.fillRect(0, 0, width, 60);
        ctx.fillStyle = '#198444'; ctx.fillRect(0, height - 60, width, 60);
        ctx.fillStyle = '#2452d6'; ctx.fillRect(0, 0, 60, height);
        ctx.fillStyle = '#f2b600'; ctx.fillRect(width - 60, 0, 60, height);
        ctx.fillStyle = '#111827'; ctx.textAlign = 'center'; ctx.font = 'bold 64px monospace';
        ctx.fillText(label, width / 2, height / 2);
        ctx.font = '42px monospace'; ctx.fillText(`${width} x ${height}`, width / 2, height / 2 + 70);
        ctx.fillText('BORDE SUPERIOR', width / 2, 130);
        ctx.fillText('BORDE INFERIOR', width / 2, height - 100);
        return canvas.toDataURL('image/png').split(',')[1];
    }, { width, height, label });
    return Buffer.from(data, 'base64');
}
async function assertFittedImage(page, image, dimensions) {
    await image.waitFor();
    await page.waitForFunction(selector => {
        const img = document.querySelector(selector); return img?.complete && img.naturalWidth > 0;
    }, `${modalSelector} ${imageSelector}`);
    // onLoad, visualViewport and ResizeObserver each commit layout in a frame.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    const fit = await image.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const ratio = Math.min(rect.width / node.naturalWidth, rect.height / node.naturalHeight);
        const content = { left: rect.left + (rect.width - node.naturalWidth * ratio) / 2,
            right: rect.right - (rect.width - node.naturalWidth * ratio) / 2,
            top: rect.top + (rect.height - node.naturalHeight * ratio) / 2,
            bottom: rect.bottom - (rect.height - node.naturalHeight * ratio) / 2 };
        let clipped = false;
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const bounds = parent.getBoundingClientRect(), css = getComputedStyle(parent);
            if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowX)
                && (content.left < bounds.left - 2 || content.right > bounds.right + 2)) clipped = true;
            if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowY)
                && (content.top < bounds.top - 2 || content.bottom > bounds.bottom + 2)) clipped = true;
            if (parent.hasAttribute('data-private-document-viewer')) break;
        }
        return { fit: style.objectFit, width: rect.width, height: rect.height, left: rect.left, top: rect.top,
            right: rect.right, bottom: rect.bottom, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight,
            viewportWidth: innerWidth, viewportHeight: innerHeight, clippedByAncestor: clipped };
    });
    assert.equal(fit.fit, 'contain', 'the viewer must preserve the full photo instead of cropping');
    assert.ok(fit.width > 50 && fit.height > 50, 'the photograph must have a meaningful visible area');
    assert.ok(fit.left >= -1 && fit.top >= -1 && fit.right <= fit.viewportWidth + 1 && fit.bottom <= fit.viewportHeight + 1,
        'the fitted photo element must stay inside the desktop/mobile viewport: ' + JSON.stringify(fit));
    assert.ok(Math.abs(fit.naturalWidth / fit.naturalHeight - dimensions.width / dimensions.height) < 0.002,
        'portrait and landscape orientation must be preserved');
    assert.equal(fit.clippedByAncestor, false, 'the four photo edges cannot be hidden by a scrolling or clipped ancestor in fitted mode');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    return fit;
}
async function assertAuthExpiry(portal, fixture, entry) {
    const context = await newContext();
    await context.addInitScript(({ token, id }) => {
        if (location.pathname === '/admin/gestoria' && !sessionStorage.getItem('viewer-auth-fixture-seeded')) {
            localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true');
            sessionStorage.setItem('viewer-auth-fixture-seeded', 'true');
        }
    }, { token: portal.adminSessionToken, id: fixture.users[0].id });
    const page = await context.newPage(); lastPage = page;
    await goto(page, '/admin/gestoria?documentos=' + portal.withTradeIn);
    await page.locator(`[data-admin-document="${entry.id}"]`).getByRole('button', { name: 'Abrir imagen', exact: true }).click();
    await page.locator(modalSelector).waitFor();
    await assertFittedImage(page, page.locator(imageSelector), { width: 1200, height: 2000 });
    await page.evaluate(() => window.dispatchEvent(new Event('autosporting-auth-expired')));
    await page.waitForURL(url => url.pathname === '/login');
    await page.getByRole('button', { name: /INICIAR SESIÓN/ }).waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => getComputedStyle(document.body).overflow !== 'hidden', null, { timeout: 5000 });
    assert.equal(await page.locator(modalSelector).count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
    await page.screenshot({ path: path.join(output, '390x844-login-despues-expirar.png') });
    console.log('ok - sesión vencida vuelve al login visible y libera el scroll del documento');
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    const portal = fixture.buyerPortal;
    assert.ok(portal?.adminSessionToken, 'requires the disposable buyer portal fixture runner');
    const existing = await (await fetch(base + '/api/admin/buyer-portal/documents?' + new URLSearchParams({ saleId: portal.withTradeIn, tradeInId: portal.tradeInId }), {
        headers: { Authorization: 'Bearer ' + portal.adminSessionToken }
    })).json();
    const usedSlots = new Set(existing.groups.flatMap(group => group.entries.map(entry => Number(entry.slot.split('-').at(-1)))));
    const numbers = Array.from({ length: 59 }, (_, index) => index + 41).filter(number => !usedSlots.has(number));
    assert.ok(numbers.length >= 3, 'reset disposable fixtures when the local upload slots are exhausted');
    if (process.env.VIEWER_ONLY_AUTH_EXPIRY === '1') {
        const entry = existing.groups.flatMap(group => group.entries).filter(entry => entry.fileName === 'retrato-ficticio.jpg').at(-1);
        assert.ok(entry, 'requires a previous upload from this disposable viewer suite');
        await assertAuthExpiry(portal, fixture, entry);
        fs.writeFileSync(path.join(output, 'auth-expiry-result.json'), JSON.stringify({ passed: true, authExpiryUnmountRestoresScrolling: true, productionAccess: false }));
    } else {
    const configured = await fetch(base + '/api/admin/buyer-portal/sales/' + portal.withTradeIn, { method: 'PUT',
        headers: { Authorization: 'Bearer ' + portal.adminSessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) });
    assert.equal(configured.status, 200);
    const configuration = await configured.json();
    const buyerContext = await newContext();
    const buyer = await buyerContext.newPage(); lastPage = buyer;
    await goto(buyer, configuration.url);
    const send = async () => {
        const response = responseFor(buyer, '/challenge', 'POST');
        await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
        return response;
    };
    let sent = await send();
    if (sent.status() === 429) { assert.match((await sent.json()).message, /60 segundos/); await buyer.waitForTimeout(60000); sent = await send(); }
    assert.equal(sent.status(), 200);
    await buyer.getByLabel('Código de 6 dígitos', { exact: true }).waitFor();
    const messages = await (await fetch(base + '/__test-mail.json')).json();
    const mail = messages.filter(item => item.to === portal.buyerOneEmail && /Código para tu portal/.test(item.subject)).at(-1);
    assert.ok(mail);
    const code = await buyer.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], mail.html);
    await buyer.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await buyer.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await buyer.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    const portrait = await borderedPhoto(buyer, 1200, 2000, 'RETRATO FICTICIO');
    const landscape = await borderedPhoto(buyer, 2000, 1000, 'PAISAJE FICTICIO');
    const pdf = pdfFixture();
    const files = [
        { number: numbers[0], name: 'retrato-ficticio.png', mimeType: 'image/png', buffer: portrait, width: 1200, height: 2000 },
        { number: numbers[1], name: 'paisaje-ficticio.png', mimeType: 'image/png', buffer: landscape, width: 2000, height: 1000 },
        { number: numbers[2], name: 'visor-ficticio.pdf', mimeType: 'application/pdf', buffer: pdf }
    ];
    for (const file of files) {
        const form = buyer.locator('[data-upload-requirement="title"]');
        await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name: file.name, mimeType: file.mimeType, buffer: file.buffer });
        await form.getByLabel('Número de página o PDF', { exact: true }).fill(String(file.number));
        const response = responseFor(buyer, '/documents', 'POST');
        await form.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
        const result = await response; assert.equal(result.status(), 200);
        file.entry = (await result.json()).entry;
        await form.getByRole('status').filter({ hasText: 'Carga guardada:' }).waitFor();
    }
    console.log('ok - retrato, paisaje y PDF ficticios cargados por el comprador verificado');
    const adminContext = await newContext({ viewport: { width: 1440, height: 900 } });
    await adminContext.addInitScript(({ token, id }) => {
        localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true');
    }, { token: portal.adminSessionToken, id: fixture.users[0].id });
    const admin = await adminContext.newPage(); lastPage = admin;
    await goto(admin, '/admin/gestoria?documentos=' + portal.withTradeIn);
    const documents = admin.locator('[data-gestoria-buyer-documents]');
    await documents.waitFor();
    const originalUrl = admin.url();
    const geometries = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 740, height: 320 }]) {
        await admin.setViewportSize(viewport);
        for (const file of files.filter(item => item.mimeType.startsWith('image/'))) {
            const row = documents.locator(`[data-admin-document="${file.entry.id}"]`);
            const opener = viewport.width === 1440 && file.width < file.height
                ? row.getByRole('button', { name: /^Ver imagen:/ })
                : row.getByRole('button', { name: 'Abrir imagen', exact: true });
            await opener.click();
            const modal = admin.locator(modalSelector); await modal.waitFor();
            const fit = await assertFittedImage(admin, modal.locator(imageSelector), file);
            geometries.push({ viewport, orientation: file.width < file.height ? 'portrait' : 'landscape', ...fit });
            assert.equal(adminContext.pages().length, 1, 'opening a document cannot create a new browser tab');
            assert.equal(admin.url(), originalUrl, 'viewing a document must stay in the CRM');
            assert.equal(await modal.locator('a[target="_blank"]').count(), 0);
            await admin.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-${file.width < file.height ? 'retrato' : 'paisaje'}.png`) });
            await admin.keyboard.press('Escape');
            await modal.waitFor({ state: 'detached' });
            await documents.waitFor();
            await admin.waitForFunction(node => document.activeElement === node, await opener.elementHandle(), { timeout: 5000 });
            assert.equal(await admin.evaluate(() => getComputedStyle(document.body).overflow), 'hidden', 'closing the nested image viewer must keep the document list modal open');
        }
        console.log(`ok - fotos y foco conservados en ${viewport.width}x${viewport.height}`);
    }
    console.log('ok - fotos completas dentro del CRM en escritorio, móvil y horizontal; Escape conserva el legajo');
    await admin.setViewportSize({ width: 390, height: 844 });
    const photoRow = documents.locator(`[data-admin-document="${files[0].entry.id}"]`);
    await photoRow.getByRole('button', { name: 'Abrir imagen', exact: true }).click();
    let modal = admin.locator(modalSelector); await modal.waitFor();
    const zoom = modal.getByRole('button', { name: 'Ampliar', exact: true });
    const zoomAvailable = await zoom.count() > 0;
    assert.equal(zoomAvailable, true, 'document detail must remain readable through internal zoom controls');
    if (zoomAvailable) {
        await zoom.click();
        const stage = modal.locator('[data-private-document-stage]');
        await admin.waitForFunction(() => {
            const el = document.querySelector('[data-private-document-stage]');
            return el && el.scrollHeight > el.clientHeight + 10;
        });
        await admin.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await stage.evaluate(node => node.scrollTo(0, 0));
        const start = await modal.locator(imageSelector).boundingBox(), stageBounds = await stage.boundingBox();
        assert.ok(start.x >= stageBounds.x - 2 && start.y >= stageBounds.y - 2, 'zoomed top and left edges must be reachable');
        await stage.evaluate(node => node.scrollTo(node.scrollWidth, node.scrollHeight));
        const end = await modal.locator(imageSelector).boundingBox();
        assert.ok(end.x + end.width <= stageBounds.x + stageBounds.width + 2 && end.y + end.height <= stageBounds.y + stageBounds.height + 2,
            'zoomed bottom and right edges must be reachable');
        assert.equal(adminContext.pages().length, 1);
        await modal.getByRole('button', { name: 'Ajustar a pantalla', exact: true }).click();
        await assertFittedImage(admin, modal.locator(imageSelector), files[0]);
    }
    await modal.getByRole('button', { name: 'Cerrar documento', exact: true }).click();
    await modal.waitFor({ state: 'detached' }); await documents.waitFor();
    await admin.waitForFunction(node => document.activeElement === node, await photoRow.getByRole('button', { name: 'Abrir imagen', exact: true }).elementHandle(), { timeout: 5000 });
    // A rejected renewed authorization must replace the image with an error,
    // and a successful retry must recover it without leaving the CRM.
    await photoRow.getByRole('button', { name: 'Abrir imagen', exact: true }).click();
    modal = admin.locator(modalSelector); await modal.waitFor();
    await assertFittedImage(admin, modal.locator(imageSelector), files[0]);
    const accessPattern = '**/api/admin/buyer-portal/documents/' + files[0].entry.id + '/access';
    await adminContext.route(accessPattern, route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Acceso de prueba vencido.' }) }));
    await modal.getByRole('button', { name: 'Renovar acceso', exact: true }).click();
    await modal.getByRole('alert').filter({ hasText: 'Acceso de prueba vencido.' }).waitFor();
    assert.equal(await modal.locator(imageSelector).count(), 0, 'a denied renewed access must not keep the old image mounted');
    await adminContext.unroute(accessPattern);
    await modal.getByRole('button', { name: 'Reintentar documento', exact: true }).click();
    await assertFittedImage(admin, modal.locator(imageSelector), files[0]);
    assert.equal(admin.url(), originalUrl); assert.equal(adminContext.pages().length, 1);
    await modal.getByRole('button', { name: 'Cerrar documento', exact: true }).click();
    await modal.waitFor({ state: 'detached' }); await documents.waitFor();
    const pdfRow = documents.locator(`[data-admin-document="${files[2].entry.id}"]`);
    await pdfRow.getByRole('button', { name: 'Abrir PDF completo', exact: true }).click();
    modal = admin.locator(modalSelector); await modal.waitFor();
    const frame = modal.locator(pdfSelector); await frame.waitFor();
    const src = await frame.getAttribute('src');
    const response = await admin.request.get(new URL(src, base).href);
    assert.equal(response.status(), 200); assert.deepEqual(await response.body(), pdf);
    assert.equal(adminContext.pages().length, 1); assert.equal(admin.url(), originalUrl);
    await admin.screenshot({ path: path.join(output, '390x844-pdf.png') });
    await modal.getByRole('button', { name: 'Cerrar documento', exact: true }).click();
    await modal.waitFor({ state: 'detached' }); await documents.waitFor();
    // Every original file is still protected independently of the internal UI.
    for (const file of files) assert.equal((await admin.request.get(base + '/api/buyer-portal/files/' + file.entry.id)).status(), 401);
    // Session loss while nested dialogs are mounted must not leave login scroll-locked.
    await assertAuthExpiry(portal, fixture, files[0].entry);
    const report = { passed: true, files: ['portrait photo', 'landscape photo', 'PDF'], viewports: geometries.map(item => item.viewport),
        fullPhotoWithoutCropping: true, noNewTabs: true, crmUrlUnchanged: true, nestedEscapePreservesDocumentation: true,
        closeButtonWorks: true, focusReturnsToOpener: true, authExpiryUnmountRestoresScrolling: true,
        zoomAndFitAvailable: zoomAvailable, zoomCanPanToAllEdges: true, rejectedAccessClearsImageAndRetryRecovers: true,
        pdfBytesPreserved: true, unsignedFilesStillBlocked: true,
        productionAccess: false, employeeAccountsUsed: false, realEmailsSent: false, geometries };
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(report, null, 2));
    console.log('PASS: visor privado interno, fotos completas en escritorio/celular y PDF sin salir del CRM.');
    }
} catch (error) {
    console.error('FAIL:', error);
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally {
    let timeout;
    await Promise.race([browser.close(), new Promise(resolve => { timeout = setTimeout(resolve, 10000); })]);
    clearTimeout(timeout);
}
