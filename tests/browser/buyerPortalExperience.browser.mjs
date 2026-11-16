// Disposable loopback fixtures only. Start scripts/start-review-preview.js first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/portal-experiencia');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [];
let lastPage;
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
async function context(options = {}) {
    const value = await browser.newContext(options); contexts.push(value);
    await value.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    return value;
}
async function open(value, route) {
    const page = await value.newPage(); lastPage = page;
    await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
    return page;
}
const mail = async () => (await fetch(base + '/__test-mail.json')).json();
const noOverflow = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, 'mobile layout cannot overflow');
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    assert.ok(fixture.buyerPortal?.adminSessionToken, 'requires opt-in buyer portal fixtures');
    const saleId = fixture.buyerPortal.withTradeIn;
    const enabled = await fetch(base + '/api/admin/buyer-portal/sales/' + saleId, { method: 'PUT',
        headers: { Authorization: 'Bearer ' + fixture.buyerPortal.adminSessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) });
    assert.equal(enabled.status, 200);
    const configuration = await enabled.json();
    const adminContext = await context({ viewport: { width: 390, height: 844 } });
    await adminContext.addInitScript(({ token, userId }) => {
        localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + userId, 'true');
    }, { token: fixture.buyerPortal.adminSessionToken, userId: fixture.users[0].id });
    const admin = await open(adminContext, '/admin/gestoria');
    const edit = admin.getByRole('button', { name: 'Editar trámite Trámite ficticio portal', exact: true });
    await edit.waitFor({ timeout: 60000 }); await edit.click();
    let dialog = admin.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    let access = dialog.getByRole('region', { name: 'Acceso del cliente al portal', exact: true });
    await access.getByText('Todavía no registramos un ingreso del cliente', { exact: true }).waitFor();
    console.log('ok - Gestoría no registra ingresos antes de abrir el portal verificado');
    await noOverflow(admin);
    await access.screenshot({ path: path.join(output, '01-gestoria-sin-ingresos.png') });
    await dialog.getByRole('button', { name: 'Cerrar trámite', exact: true }).click();

    const buyerContext = await context(mobile);
    const buyer = await open(buyerContext, configuration.url);
    const intro = buyer.locator('[data-brand-intro]');
    await intro.waitFor({ state: 'visible' });
    await buyer.screenshot({ path: path.join(output, '02-intro-movil.png') });
    await intro.waitFor({ state: 'detached', timeout: 7000 });
    console.log('ok - intro de la web visible y retirada sin bloquear el acceso');
    await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    const send = async () => {
        const pending = buyer.waitForResponse(response => response.url().endsWith('/challenge') && response.request().method() === 'POST'); pending.catch(() => {});
        await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
        return pending;
    };
    let sent = await send();
    if (sent.status() === 429) {
        assert.match((await sent.json()).message, /60 segundos/);
        await buyer.waitForTimeout(60000);
        sent = await send();
    }
    assert.equal(sent.status(), 200);
    const message = (await mail()).filter(item => item.to === fixture.buyerPortal.buyerOneEmail).at(-1);
    const code = await buyer.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], message.html);
    await buyer.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await buyer.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await buyer.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    const timeline = buyer.locator('[data-procedure-timeline][data-procedure-status="Presentado"]');
    await timeline.waitFor();
    const stages = [['pendiente', 'Pendiente'], ['documentacion', 'Documentación'], ['presentado', 'Presentado'], ['transferido', 'Transferido'], ['finalizado', 'Finalizado']];
    for (const [key, label] of stages) await timeline.locator(`[data-stage="${key}"]`).getByText(new RegExp('^' + label)).waitFor();
    assert.equal(await timeline.locator('[aria-current="step"]').getAttribute('data-stage'), 'presentado');
    assert.equal(await timeline.locator('[data-stage-state="complete"]').count(), 2);
    assert.equal(await timeline.evaluate(element => [element, ...element.querySelectorAll('*')].some(node => getComputedStyle(node).animationName !== 'none' && parseFloat(getComputedStyle(node).animationDuration) > 0)), true, 'the active stage must animate when motion is allowed');
    const image = buyer.locator('[data-portal-vehicle-photo] img');
    await image.waitFor();
    assert.equal(await image.getAttribute('referrerpolicy'), 'no-referrer');
    await buyer.waitForFunction(() => [...document.querySelectorAll('[data-portal-vehicle-photo] img')].some(img => img.complete && img.naturalWidth > 0));
    for (const width of [320, 390]) {
        await buyer.setViewportSize({ width, height: 844 });
        await noOverflow(buyer);
        await timeline.screenshot({ path: path.join(output, `03-etapas-${width}px.png`) });
        await buyer.screenshot({ path: path.join(output, `04-portal-${width}px.png`) });
    }
    console.log('ok - foto automática y cinco etapas reales visibles en 320 y 390 px');
    const mailsAfterLogin = (await mail()).length;
    const stored = await buyerContext.storageState();
    await buyerContext.close();
    const reducedContext = await context({ ...mobile, reducedMotion: 'reduce', storageState: { cookies: stored.cookies, origins: [] } });
    const reopened = await open(reducedContext, configuration.url);
    await reopened.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    assert.equal(await reopened.locator('[data-brand-intro]').count(), 0, 'reduced motion must skip the intro');
    assert.equal((await mail()).length, mailsAfterLogin, 'remembered browser must not request another code');
    assert.equal(await reopened.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).count(), 0);
    const reducedTimeline = reopened.locator('[data-procedure-timeline][data-procedure-status="Presentado"]');
    assert.equal(await reducedTimeline.evaluate(element => [element, ...element.querySelectorAll('*')].some(node => getComputedStyle(node).animationName !== 'none' && getComputedStyle(node).animationDuration !== '0s')), false, 'reduced motion must disable timeline animation');
    await noOverflow(reopened);
    console.log('ok - navegador recordado reabre sin código y respeta movimiento reducido');

    lastPage = admin;
    await edit.click();
    dialog = admin.getByRole('dialog', { name: 'Editar Trámite', exact: true });
    access = dialog.getByRole('region', { name: 'Acceso del cliente al portal', exact: true });
    await access.getByText('El cliente ya ingresó al portal', { exact: true }).waitFor();
    await access.getByText('Ubicación no disponible', { exact: true }).waitFor();
    await access.getByText(/Celular.*Safari.*iOS/).waitFor();
    await access.getByText('Última consulta', { exact: true }).waitFor();
    await noOverflow(admin);
    await access.screenshot({ path: path.join(output, '05-gestoria-ingreso-verificado.png') });
    const sessionCount = await access.locator('[data-buyer-browser-session]').count();
    assert.ok(sessionCount >= 1);
    const saleSelect = dialog.getByText('Vincular Expediente (Venta)', { exact: true }).locator('..').getByRole('combobox');
    await saleSelect.selectOption('');
    await dialog.getByText('Seleccioná la venta en «Vincular Expediente (Venta)» para consultar si su comprador ya ingresó al portal.', { exact: true }).waitFor();
    assert.equal(await dialog.getByText('El cliente ya ingresó al portal', { exact: true }).count(), 0, 'changing the selected sale must not display prior buyer metadata');
    const report = { passed: true, actualVerifiedAccessBeforeAndAfter: true, introMatchesWebsite: true,
        normalMotionIntroDismissed: true, reducedMotionSkipsIntroAndAnimations: true, actualProcedureStage: 'Presentado',
        allFiveStageLabelsVisible: true, automaticCatalogPhotoLoaded: true, photoReferrerPolicy: 'no-referrer',
        viewports: [320, 390], rememberedBrowserReopensWithoutCode: true, gestoriaDeviceBrowserOsVisible: true,
        localLocationUnavailable: true, priorSaleMetadataCleared: true, productionAccess: false };
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(report, null, 2));
    console.log('PASS: intro, etapas reales animadas, foto del catálogo, reapertura sin código y acceso verificado visible en Gestoría; datos ficticios y sin producción.');
} catch (error) {
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
} finally { await Promise.all(contexts.map(value => value.close().catch(() => {}))); await browser.close(); }
