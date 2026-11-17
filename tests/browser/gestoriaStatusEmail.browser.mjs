// Real Next.js API + strict loopback SMTP sink. All records and recipients are fictitious.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/tramite-correo');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let context, page;
const mailbox = async () => (await fetch(base + '/__test-mail.json')).json();
const statusMail = item => item.subject === 'AutoSporting | Se actualizó el estado de la documentación de tu vehículo';
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    assert.ok(fixture.buyerPortal?.adminSessionToken, 'requires the opt-in buyer portal fixtures and SMTP sink');
    const token = fixture.buyerPortal.adminSessionToken;
    const configured = await fetch(base + '/api/admin/buyer-portal/sales/' + fixture.buyerPortal.withTradeIn, { method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) });
    assert.equal(configured.status, 200);
    const configuration = await configured.json();
    context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.addInitScript(({ session, userId }) => {
        localStorage.setItem('token', session); localStorage.setItem('autosporting_tour_seen_' + userId, 'true');
    }, { session: token, userId: fixture.users[0].id });
    page = await context.newPage();
    page.on('pageerror', error => console.error('Browser error:', error.message));
    await page.goto(base + '/admin/gestoria', { waitUntil: 'domcontentloaded', timeout: 180000 });
    const edit = page.getByRole('button', { name: 'Editar trámite Trámite ficticio portal', exact: true });
    await edit.waitFor({ timeout: 60000 });
    const before = (await mailbox()).filter(statusMail).length;
    await edit.click();
    let dialog = page.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    const state = () => dialog.getByText('Estado del Trámite', { exact: true }).locator('..').getByRole('combobox');
    const initialState = await state().inputValue();
    const nextState = initialState === 'Transferido' ? 'Finalizado' : 'Transferido';
    await state().selectOption(nextState);
    const saved = page.waitForResponse(response => /\/api-gestoria\/[^/]+$/.test(new URL(response.url()).pathname) && response.request().method() === 'PUT');
    saved.catch(() => {});
    await dialog.getByRole('button', { name: 'Guardar Trámite', exact: true }).click();
    const response = await saved;
    assert.equal(response.status(), 200);
    const body = await response.json();
    assert.equal(body.status, nextState);
    assert.equal(body.emailNotification.status, 'sent');
    await dialog.waitFor({ state: 'detached' });
    const notice = page.locator('[data-gestoria-email-notice]');
    await notice.getByText('Estado actualizado y aviso enviado al cliente.', { exact: true }).waitFor();
    console.log('ok - Next.js guardó el nuevo estado y el SMTP local aceptó el aviso');
    const messages = (await mailbox()).filter(statusMail);
    assert.equal(messages.length, before + 1);
    const message = messages.at(-1);
    assert.equal(message.to, fixture.buyerPortal.buyerOneEmail);
    assert.match(message.html, new RegExp(nextState));
    assert.match(message.html, /Hora argentina/);
    assert.ok(message.html.includes(configuration.url));
    assert.doesNotMatch(message.html, /NOTA GESTOR INTERNA PRIVADA|NOTA INTERNA PRIVADA|código de 6/i);
    await notice.screenshot({ path: path.join(output, '01-aviso-enviado-movil.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);

    await edit.click();
    dialog = page.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    assert.equal(await state().inputValue(), nextState);
    await dialog.locator('[data-gestoria-email-notice]').getByText('Último aviso de este trámite: enviado al cliente.', { exact: true }).waitFor();
    await dialog.getByPlaceholder('Firma pendiente de la esposa, falta libre deuda...', { exact: true }).fill('NOTA PRIVADA: edición sin cambiar estado');
    const unchanged = page.waitForResponse(item => /\/api-gestoria\/[^/]+$/.test(new URL(item.url()).pathname) && item.request().method() === 'PUT');
    unchanged.catch(() => {});
    await dialog.getByRole('button', { name: 'Guardar Trámite', exact: true }).click();
    const unchangedResponse = await unchanged;
    assert.equal(unchangedResponse.status(), 200);
    assert.equal((await unchangedResponse.json()).emailNotification.status, 'not_needed');
    await dialog.waitFor({ state: 'detached' });
    assert.equal((await mailbox()).filter(statusMail).length, before + 1);
    console.log('ok - guardar solo observaciones no genera otro correo');
    const report = { passed: true, realNextApiPut: true, strictLoopbackSmtpAccepted: true, customerRecipientConfirmed: true,
        stateNoticeContainsNewState: true, existingPortalLinkIncluded: true, internalNotesExcluded: true,
        successfulDeliveryFeedbackVisible: true, historySurvivesModalReopen: true, unchangedStatusDoesNotResend: true,
        mobileViewport: { width: 390, height: 844 }, employeeAccountsUsed: false, realEmailsSent: false, productionAccess: false };
    fs.writeFileSync(path.join(output, 'resultado-browser.json'), JSON.stringify(report, null, 2));
    console.log('PASS: cambio real de estado desde Gestoría, correo al comprador en SMTP local y guardado sin cambios sin duplicados.');
} catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
} finally { await context?.close().catch(() => {}); await browser.close(); }
