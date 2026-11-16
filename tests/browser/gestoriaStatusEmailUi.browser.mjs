// Uses fake loopback data; all notification writes are intercepted UI fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/gestoria-correo');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let page;
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    assert.ok(fixture.buyerPortal?.adminSessionToken, 'requires disposable buyer portal fixtures');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const auth = { Authorization: 'Bearer ' + fixture.buyerPortal.adminSessionToken };
    const list = await (await context.request.get(base + '/api-gestoria', { headers: auth })).json();
    const tramite = list.find(item => item.saleId === fixture.buyerPortal.withTradeIn);
    assert.ok(tramite, 'requires the fictitious linked Gestoria procedure');
    const notificationId = 'f'.repeat(24);
    const route = '/api-gestoria/' + tramite._id;
    let summary = { id: notificationId, status: 'failed', reason: 'delivery_failed', retryable: true };
    let retryCount = 0;
    await context.route('**/*', async intercepted => {
        const request = intercepted.request();
        const url = new URL(request.url());
        if (url.hostname !== '127.0.0.1') return intercepted.abort();
        if (url.pathname === route + '/notifications' && request.method() === 'GET') {
            return intercepted.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailNotification: summary }) });
        }
        if (url.pathname === route + '/notifications/' + notificationId + '/retry' && request.method() === 'POST') {
            retryCount++;
            summary = { id: notificationId, status: 'sent', retryable: false };
            return intercepted.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ emailNotification: summary }) });
        }
        if (url.pathname === route && request.method() === 'PUT') {
            summary = { id: notificationId, status: 'failed', reason: 'delivery_failed', retryable: true };
            const requested = request.postDataJSON();
            return intercepted.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...tramite, ...requested, emailNotification: summary }) });
        }
        return intercepted.continue();
    });
    await context.addInitScript(({ token, id }) => {
        localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true');
    }, { token: fixture.buyerPortal.adminSessionToken, id: fixture.users[0].id });
    page = await context.newPage();
    const open = async () => {
        await page.goto(base + '/admin/gestoria', { waitUntil: 'domcontentloaded', timeout: 180000 });
        await page.getByRole('button', { name: 'Editar trámite ' + tramite.title, exact: true }).click();
        return page.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    };
    let dialog = await open();
    await dialog.getByText('El último aviso de este trámite no se pudo enviar.', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Editar trámite ' + tramite.title, exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    await dialog.getByText('El último aviso de este trámite no se pudo enviar.', { exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Reintentar aviso', exact: true }).click();
    await dialog.getByText('Último aviso de este trámite: enviado al cliente.', { exact: true }).waitFor();
    assert.equal(retryCount, 1);
    console.log('ok - fallo visible después de recargar; reintento explícito cambia el aviso a enviado');
    await dialog.getByRole('button', { name: 'Cerrar trámite', exact: true }).click();
    summary = { id: notificationId, status: 'failed', reason: 'delivery_uncertain', retryable: false };
    await page.getByRole('button', { name: 'Editar trámite ' + tramite.title, exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    await dialog.getByText('No se pudo confirmar el envío; revisá antes de reenviar.', { exact: true }).waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Reintentar aviso', exact: true }).count(), 0, 'an uncertain delivery cannot be blindly retried');
    console.log('ok - un envío incierto se informa sin ofrecer un reenvío automático');
    await dialog.getByRole('button', { name: 'Cerrar trámite', exact: true }).click();
    summary = { id: notificationId, status: 'pending', retryable: true };
    await page.getByRole('button', { name: 'Editar trámite ' + tramite.title, exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    await dialog.getByText('El último aviso de este trámite está pendiente de envío.', { exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Reintentar aviso', exact: true }).click();
    await dialog.getByText('Último aviso de este trámite: enviado al cliente.', { exact: true }).waitFor();
    assert.equal(retryCount, 2, 'a queued, not-yet-attempted notification remains recoverable');
    console.log('ok - un aviso pendiente sin intento previo permite recuperación manual');
    const status = dialog.getByText('Estado del Trámite', { exact: true }).locator('..').getByRole('combobox');
    await status.selectOption(tramite.status === 'Transferido' ? 'Finalizado' : 'Transferido');
    await dialog.getByRole('button', { name: 'Guardar Trámite', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    const notice = page.locator('[data-gestoria-email-notice]');
    await notice.getByText('El estado quedó actualizado, pero no se pudo enviar el aviso al cliente.', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'ui-fallo-envio-movil.png') });
    await notice.getByRole('button', { name: 'Reintentar aviso', exact: true }).click();
    await notice.getByText('Estado actualizado y aviso enviado al cliente.', { exact: true }).waitFor();
    assert.equal(retryCount, 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    await page.screenshot({ path: path.join(output, 'ui-reintento-enviado-movil.png') });
    const result = { passed: true, failureSurvivesReload: true, explicitRetrySent: true, uncertainRetryHidden: true, queuedPendingRetryAllowed: true,
        saveFailureNoticePersistsAfterModalCloses: true, mobileViewport: 390, writesMocked: true, realEmailsSent: false, productionAccess: false };
    fs.writeFileSync(path.join(output, 'resultado-ui.json'), JSON.stringify(result, null, 2));
    console.log('PASS: feedback de correo, fallo persistido, reintento y envío incierto; escrituras simuladas y sin correos reales.');
    await context.close();
} catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'ui-failure.png') }).catch(() => {});
    throw error;
} finally { await browser.close(); }
