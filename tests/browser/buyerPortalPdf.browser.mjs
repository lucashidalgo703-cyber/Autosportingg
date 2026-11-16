// Run after buyerPortal.browser.mjs against the same disposable fixture runner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/inventario-portal');
fs.mkdirSync(output, { recursive: true });
const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
    '<< /Length 0 >>\nstream\n\nendstream'
];
let source = '%PDF-1.4\n', offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(source);
source += 'xref\n0 5\n0000000000 65535 f \n' + offsets.slice(1).map(value => String(value).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const pdf = Buffer.from(source);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let page;
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    assert.ok(fixture.buyerPortal?.adminSessionToken);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    page = await context.newPage();
    const configurationResponse = await page.request.get(base + '/api/admin/buyer-portal/sales/' + fixture.buyerPortal.withTradeIn, { headers: { Authorization: 'Bearer ' + fixture.buyerPortal.adminSessionToken } });
    assert.equal(configurationResponse.status(), 200);
    const configuration = await configurationResponse.json();
    await page.goto(new URL(configuration.url, base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
    await page.getByLabel('Código de 6 dígitos', { exact: true }).waitFor();
    const mailbox = await (await page.request.get(base + '/__test-mail.json')).json();
    const message = mailbox.filter(item => item.to === fixture.buyerPortal.buyerOneEmail).at(-1);
    const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], message.html);
    await page.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await page.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    const form = page.getByRole('form', { name: /Cargar documentación de PT001AA/ });
    await form.getByLabel('Requisito', { exact: true }).selectOption('title');
    await form.getByLabel('Descripción de esta foto o PDF', { exact: true }).fill('CAT · PDF completo');
    await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name: 'titulo-ficticio-completo.pdf', mimeType: 'application/pdf', buffer: pdf });
    const upload = page.waitForResponse(response => response.url().endsWith('/documents') && response.request().method() === 'POST'); upload.catch(() => {});
    await form.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
    assert.ok([200, 201].includes((await upload).status()));
    await form.getByRole('status').filter({ hasText: 'Carga guardada:' }).waitFor();
    const title = page.locator('[data-requirement="title"]');
    assert.equal(await title.locator('[data-document-entry][data-document-current="true"]').count(), 1);
    assert.equal(await title.locator('img').count(), 0, 'a PDF must remain one complete file');
    const frame = title.locator('iframe[title="Vista previa de CAT · PDF completo"]');
    await frame.waitFor();
    const signedUrl = await frame.getAttribute('src');
    const fetched = await page.request.get(new URL(signedUrl, base).href);
    assert.equal(fetched.status(), 200);
    assert.match(fetched.headers()['content-type'], /^application\/pdf/);
    assert.deepEqual(await fetched.body(), pdf);
    await frame.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'portal-pdf-completo.png') });
    console.log('Portal PDF OK: carga individual, un archivo completo, iframe privado y bytes originales recuperados por enlace firmado.');
} catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'portal-pdf-failure.png') }).catch(() => {});
    throw error;
} finally { await browser.close(); }
