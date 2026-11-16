// Start scripts/start-review-preview.js first. Disposable DB/mail/accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/documentos-edicion');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let page, context, portalBase;
const mutations = [];
const resumeAfterReplacement = process.env.EDITING_RESUME_AFTER_REPLACEMENT === '1';
function localUrl(value) {
    const url = new URL(value, base); assert.equal(url.origin, base, 'test requests must stay on the loopback fixture runner'); return url.href;
}
function responseFor(suffix, method) {
    const pending = page.waitForResponse(response => response.url().endsWith(suffix) && response.request().method() === method);
    pending.catch(() => {}); return pending;
}
const groupFor = key => page.locator(`[data-requirement="${key}"]`);
const currentRow = (key, id) => groupFor(key).locator(`[data-document-entry="${id}"][data-document-current="true"]`);
const currentCount = key => groupFor(key).locator('[data-document-entry][data-document-current="true"]').count();
async function sessionData() {
    const response = await page.request.get(localUrl(portalBase + '/session'));
    assert.equal(response.status(), 200); return response.json();
}
async function assertCurrent(key, ids) {
    assert.equal(await currentCount(key), ids.length);
    const data = await sessionData();
    const entries = data.tradeIns[0].groups.find(group => group.key === key).entries.filter(entry => entry.isCurrent !== false);
    assert.deepEqual(entries.map(entry => entry.id).sort(), [...ids].sort(), 'server and UI must agree on active files');
    const badge = ids.length === 0 ? /Sin archivos\s*·\s*0 archivos/ : new RegExp('·\\s*' + ids.length + (ids.length === 1 ? ' archivo$' : ' archivos$'));
    assert.equal(await groupFor(key).getByText(badge).count(), 1, 'the visible file counter must match active documents');
}
async function photo(label, color) {
    const encoded = await page.evaluate(({ label, color }) => {
        const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#eef2ff'; ctx.fillRect(0, 0, 900, 600);
        ctx.strokeStyle = color; ctx.lineWidth = 28; ctx.strokeRect(14, 14, 872, 572);
        ctx.fillStyle = '#111827'; ctx.textAlign = 'center'; ctx.font = 'bold 35px Arial'; ctx.fillText(label, 450, 300);
        ctx.font = '22px Arial'; ctx.fillText('DOCUMENTACIÓN FICTICIA · SIN DATOS PERSONALES', 450, 345);
        return canvas.toDataURL('image/png').split(',')[1];
    }, { label, color });
    return { name: label.toLowerCase().replaceAll(' ', '-') + '.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') };
}
function pdf() {
    const content = 'q 0.7 0.1 0.1 RG 8 w 20 20 360 260 re S Q\nBT /F1 18 Tf 40 145 Td (PDF FICTICIO PARA QUITAR) Tj ET\n';
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    let source = '%PDF-1.4\n'; const offsets = [];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(source);
    source += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')
        + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return { name: 'pdf-ficticio-para-quitar.pdf', mimeType: 'application/pdf', buffer: Buffer.from(source) };
}
async function saveSelected(key, replacement = false) {
    const form = groupFor(key).locator('[data-upload-requirement]');
    const response = responseFor('/documents', 'POST');
    await form.getByRole('button', { name: replacement ? 'Guardar reemplazo' : 'Guardar este archivo', exact: true }).click();
    const saved = await response;
    assert.ok([200, 201].includes(saved.status()), `document upload must succeed, received ${saved.status()}`);
    const entry = (await saved.json()).entry; assert.ok(entry?.id);
    await currentRow(key, entry.id).waitFor({ state: 'visible' });
    return entry;
}
async function upload(key, file, side, number) {
    const form = groupFor(key).locator('[data-upload-requirement]');
    await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles(file);
    if (side) await form.getByLabel('Lado', { exact: true }).selectOption(side);
    if (number) await form.getByLabel(key === 'registration_cards' ? 'Número de cédula' : 'Número de página o PDF', { exact: true }).fill(String(number));
    return saveSelected(key);
}
async function selectReplacement(key, entry, file) {
    const before = mutations.filter(request => request.method === 'POST' && request.path === portalBase + '/documents').length;
    const fileChooser = page.waitForEvent('filechooser');
    await currentRow(key, entry.id).getByRole('button', { name: 'Reemplazar archivo', exact: true }).click();
    const picker = await fileChooser; assert.equal(picker.isMultiple(), false);
    await picker.setFiles(file);
    await groupFor(key).getByRole('button', { name: 'Guardar reemplazo', exact: true }).waitFor({ state: 'visible' });
    assert.equal(mutations.filter(request => request.method === 'POST' && request.path === portalBase + '/documents').length, before, 'choosing a replacement cannot save it before confirmation');
}
async function signedUrls(key, entry) {
    const row = currentRow(key, entry.id);
    const element = row.locator(entry.mimeType === 'application/pdf' ? 'iframe' : 'img');
    await element.waitFor();
    const attribute = await element.getAttribute('src'); assert.ok(attribute);
    const response = await page.request.post(localUrl(portalBase + '/documents/' + entry.id + '/access'), { headers: { Origin: base }, data: {} });
    assert.equal(response.status(), 200);
    const fresh = await response.json();
    const urls = [...new Set([localUrl(attribute), localUrl(fresh.url)])];
    for (const url of urls) assert.equal((await page.request.get(url)).status(), 200);
    return urls;
}
async function remove(key, entry, screenshot) {
    const row = currentRow(key, entry.id);
    await row.getByRole('button', { name: 'Quitar archivo', exact: true }).click();
    await row.getByRole('group', { name: /^Confirmar eliminación de / }).waitFor();
    if (screenshot) await groupFor(key).screenshot({ path: path.join(output, screenshot), animations: 'disabled' });
    const response = responseFor('/documents/' + entry.id, 'DELETE');
    await row.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
    assert.equal((await response).status(), 200);
    await row.waitFor({ state: 'detached' });
}
async function assertRemoved(entry, urls) {
    for (const url of urls) assert.equal((await page.request.get(url)).status(), 404, 'every prior signed URL of the removed version must stop serving bytes');
    assert.equal((await page.request.post(localUrl(portalBase + '/documents/' + entry.id + '/access'), { headers: { Origin: base }, data: {} })).status(), 404);
    const data = await sessionData();
    assert.equal(data.tradeIns.flatMap(vehicle => vehicle.groups).flatMap(group => group.entries).some(item => item.id === entry.id), false);
}
async function reloadPortal() {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).count(), 0, 'the existing verified browser must survive a page reload');
}
async function assertAccess404KeepsSession(key, entry) {
    const pattern = '**' + portalBase + '/documents/' + entry.id + '/access';
    await context.route(pattern, route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Este archivo de prueba fue quitado en otra pestaña.' }) }));
    await currentRow(key, entry.id).getByRole('button', { name: 'Abrir imagen', exact: true }).click();
    const viewer = page.locator('[data-private-document-viewer]');
    await viewer.getByRole('alert').filter({ hasText: 'quitado en otra pestaña' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).count(), 0);
    await viewer.screenshot({ path: path.join(output, '1440-access404-error-local.png'), animations: 'disabled' });
    await viewer.getByRole('button', { name: 'Cerrar documento', exact: true }).click();
    await viewer.waitFor({ state: 'detached' });
    await context.unroute(pattern);
    await page.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).count(), 0);
    await sessionData();
    console.log('ok - access404 muestra error local y conserva la sesión y el portal abierto');
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    const portal = fixture.buyerPortal; assert.ok(portal?.adminSessionToken);
    assert.match(portal.buyerOneEmail, /@example\.test$/);
    const configurationResponse = await fetch(base + '/api/admin/buyer-portal/sales/' + portal.withTradeIn, { method: resumeAfterReplacement ? 'GET' : 'PUT',
        headers: { Authorization: 'Bearer ' + portal.adminSessionToken, 'Content-Type': 'application/json' }, ...(resumeAfterReplacement ? {} : { body: JSON.stringify({ days: 30 }) }) });
    assert.equal(configurationResponse.status, 200);
    const configuration = await configurationResponse.json();
    const invitation = localUrl(configuration.url);
    portalBase = '/api/buyer-portal/' + new URL(invitation).pathname.split('/').at(-1);
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce',
        ...(resumeAfterReplacement ? { storageState: path.join(output, 'sesion-exclusivamente-ficticia.json') } : {}) });
    context.setDefaultTimeout(30000);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    page = await context.newPage();
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith(portalBase + '/documents') && ['POST', 'DELETE'].includes(request.method())) mutations.push({ method: request.method(), path: url.pathname });
    });
    await page.goto(invitation, { waitUntil: 'domcontentloaded', timeout: 180000 });
    if (!resumeAfterReplacement) {
    const challenge = responseFor('/challenge', 'POST');
    await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
    assert.equal((await challenge).status(), 200, 'start with a fresh disposable preview; do not bypass login quotas');
    const mailbox = await (await page.request.get(base + '/__test-mail.json')).json();
    const message = mailbox.filter(mail => mail.to === portal.buyerOneEmail && /Código para tu portal/.test(mail.subject)).at(-1); assert.ok(message);
    const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], message.html);
    await page.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await page.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    await context.storageState({ path: path.join(output, 'sesion-exclusivamente-ficticia.json') });
    await assertCurrent('title', []); await assertCurrent('registration_cards', []);
    } else await page.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    const originalUrl = page.url();
    const a = await photo('IMAGEN INICIAL FICTICIA', '#d52c24');
    const b = await photo('SEGUNDA IMAGEN FICTICIA', '#d4a128');
    const c = await photo('REEMPLAZO FICTICIO', '#278b48');
    let first, replaced;
    if (!resumeAfterReplacement) {
    first = await upload('title', a);
    await assertCurrent('title', [first.id]);
    await reloadPortal();
    const second = await upload('title', b);
    assert.notEqual(second.slot, first.slot, 'after reload a new image must choose a free slot instead of returning 409');
    await assertCurrent('title', [first.id, second.id]);
    await selectReplacement('title', second, c);
    await groupFor('title').screenshot({ path: path.join(output, '390-reemplazo-listo.png'), animations: 'disabled' });
    replaced = await saveSelected('title', true);
    assert.equal(replaced.slot, second.slot); assert.equal(replaced.side, second.side); assert.notEqual(replaced.id, second.id);
    await assertCurrent('title', [first.id, replaced.id]);
    } else {
        const current = (await sessionData()).tradeIns[0].groups.find(group => group.key === 'title').entries.filter(entry => entry.isCurrent !== false);
        first = current.find(entry => entry.slot === 'title-page-1'); replaced = current.find(entry => entry.slot === 'title-page-2');
        assert.ok(first && replaced, 'resume requires the initial upload/reload/replacement phase from this same disposable preview');
        await assertCurrent('title', [first.id, replaced.id]);
    }
    const removedUrls = await signedUrls('title', replaced);
    const deletesBefore = mutations.filter(request => request.method === 'DELETE').length;
    await currentRow('title', replaced.id).getByRole('button', { name: 'Quitar archivo', exact: true }).click();
    await currentRow('title', replaced.id).getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(mutations.filter(request => request.method === 'DELETE').length, deletesBefore, 'canceling a removal must not call DELETE');
    await assertCurrent('title', [first.id, replaced.id]);
    await remove('title', replaced, '390-confirmar-quitar.png');
    await assertRemoved(replaced, removedUrls);
    await assertCurrent('title', [first.id]);
    await reloadPortal();
    await assertCurrent('title', [first.id]);
    assert.equal(await page.locator(`[data-document-entry="${replaced.id}"]`).count(), 0, 'the removed version cannot return after refresh');
    const reused = await upload('title', b, undefined, replaced.slot.match(/-(\d+)$/)[1]);
    assert.equal(reused.slot, replaced.slot, 'removing a file must release its slot for a fresh upload');
    await assertCurrent('title', [first.id, reused.id]);
    await groupFor('title').screenshot({ path: path.join(output, '390-documentacion-corregida.png'), animations: 'disabled' });
    console.log('ok - móvil: nueva carga tras reload, reemplazo directo, cancelar, quitar, URLs404 y slot reutilizado');

    await page.setViewportSize({ width: 1440, height: 1000 });
    const document = pdf();
    const pdfEntry = await upload('title', document);
    const pdfUrls = await signedUrls('title', pdfEntry);
    assert.deepEqual(await (await page.request.get(pdfUrls[0])).body(), document.buffer);
    await assertCurrent('title', [first.id, reused.id, pdfEntry.id]);
    await remove('title', pdfEntry, '1440-confirmar-quitar-pdf.png');
    await assertRemoved(pdfEntry, pdfUrls);
    await reloadPortal(); await assertCurrent('title', [first.id, reused.id]);
    console.log('ok - escritorio: PDF quitado, contador actualizado y firma anterior404');

    const back = await upload('registration_cards', a, 'back');
    assert.equal(back.side, 'back');
    await selectReplacement('registration_cards', back, c);
    const backReplacement = await saveSelected('registration_cards', true);
    assert.equal(backReplacement.slot, back.slot); assert.equal(backReplacement.side, 'back');
    await assertCurrent('registration_cards', [backReplacement.id]);
    const cardPdf = await upload('registration_cards', document, undefined, 2);
    assert.equal(cardPdf.mimeType, 'application/pdf');
    await selectReplacement('registration_cards', cardPdf, b);
    const form = groupFor('registration_cards').locator('[data-upload-requirement]');
    await form.getByLabel('Lado de la nueva foto', { exact: true }).selectOption('back');
    await groupFor('registration_cards').screenshot({ path: path.join(output, '1440-cedula-pdf-a-dorso.png'), animations: 'disabled' });
    const converted = await saveSelected('registration_cards', true);
    assert.equal(converted.side, 'back');
    assert.equal(converted.slot, cardPdf.slot.replace(/-complete$/, '-back'), 'a complete PDF replaced by a photo keeps its card number and explicit side');
    await assertCurrent('registration_cards', [backReplacement.id, converted.id]);
    console.log('ok - cédula: reemplazo conserva Dorso; PDF completo puede convertirse en foto del Dorso');
    await assertAccess404KeepsSession('registration_cards', converted);

    assert.equal(page.url(), originalUrl); assert.equal(context.pages().length, 1, 'editing documents must stay inside the same portal tab');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    const adminDocuments = await fetch(base + '/api/admin/buyer-portal/documents?' + new URLSearchParams({ saleId: portal.withTradeIn, tradeInId: portal.tradeInId }), { headers: { Authorization: 'Bearer ' + portal.adminSessionToken } });
    assert.equal(adminDocuments.status, 200);
    const adminIds = (await adminDocuments.json()).groups.flatMap(group => group.entries).map(entry => entry.id);
    assert.equal(adminIds.includes(replaced.id), false); assert.equal(adminIds.includes(pdfEntry.id), false);
    const report = { passed: true, executionMode: resumeAfterReplacement ? 'initial real UI upload/reload/replacement phase plus resumed remaining checks using the same fake browser cookie' : 'full flow',
        viewports: ['390x844', '1440x1000'], realBuyerUi: true, realDisposableDatabase: true,
        uploadAfterReloadUsesFreeSlot: true, directReplacementOpensFilePicker: true, replacementKeepsSlotAndCount: true,
        cancelRemovalSendsNoDelete: true, removalUpdatesCounterAndPersists: true, removedSignedUrlsReturn404: true,
        deletedSlotCanBeReused: true, pdfRemoval: true, cardBackPreserved: true, cardPdfToBackConversion: true,
        adminListExcludesRemovedVersions: true, access404KeepsPortalSession: true, noNewTabs: true, productionAccess: false, employeeAccountsUsed: false,
        realEmailsSent: false, fakeMailboxUsed: true, documentMutationCount: mutations.filter(request => /\/documents(?:\/[^/]+)?$/.test(request.path)).length };
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(report, null, 2));
    console.log('PASS: carga, reemplazo y baja de fotos/PDF en portal real con datos exclusivamente ficticios.');
} catch (error) {
    console.error('FAIL:', error);
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally { await browser.close(); }
