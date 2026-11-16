// Public invalid-token pages only; no customer account, code or documents.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOCAL_PREVIEW_BASE || 'http://127.0.0.1:3200';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('This check only permits the disposable loopback preview.');
const output = path.resolve('../../outputs/portal-logo-centro');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const results = [];
const invalidPath = '/portal/' + 'x'.repeat(43);
const center = async page => {
    await page.locator('[data-intro-logo]').waitFor();
    await page.waitForFunction(() => document.querySelector('[data-intro-logo]')?.naturalWidth > 0);
    const dimensions = await page.locator('[data-intro-logo]').evaluate(image => {
        const rect = image.getBoundingClientRect();
        const viewport = window.visualViewport;
        return { imageX: rect.x + rect.width / 2, imageY: rect.y + rect.height / 2,
            viewportX: (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth) / 2,
            viewportY: (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) / 2,
            width: rect.width, height: rect.height, imageParentIsBody: Boolean(image.closest('[data-brand-intro]')?.parentElement === document.body) };
    });
    assert.ok(Math.abs(dimensions.imageX - dimensions.viewportX) < 1, JSON.stringify(dimensions));
    assert.ok(Math.abs(dimensions.imageY - dimensions.viewportY) < 1, JSON.stringify(dimensions));
    assert.equal(dimensions.imageParentIsBody, true);
    assert.ok(dimensions.width > 0 && dimensions.height > 0);
    return dimensions;
};
try {
    for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 740, height: 320 }]) {
        const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
        await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
        const page = await context.newPage();
        await page.goto(base + invalidPath, { waitUntil: 'domcontentloaded', timeout: 180000 });
        const dimensions = await center(page);
        await page.waitForTimeout(1050);
        await center(page);
        await page.screenshot({ path: path.join(output, `intro-${viewport.width}x${viewport.height}.png`) });
        await page.locator('[data-brand-intro]').waitFor({ state: 'detached', timeout: 7000 });
        results.push({ viewport, dimensions, dismissed: true });
        await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
        const viewport = new EventTarget();
        Object.assign(viewport, { width: 360, height: 650, offsetLeft: 15, offsetTop: 30, scale: 1 });
        Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
        window.__testViewportResize = () => {
            Object.assign(viewport, { width: 340, height: 520, offsetLeft: 25, offsetTop: 85 });
            viewport.dispatchEvent(new Event('resize'));
        };
    });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(base + invalidPath, { waitUntil: 'domcontentloaded', timeout: 180000 });
    const browserBars = await center(page);
    await page.evaluate(() => window.__testViewportResize());
    await page.waitForFunction(() => document.querySelector('[data-brand-intro]')?.style.height === '520px');
    const resized = await center(page);
    results.push({ simulatedMobileBars: browserBars, resizedVisualViewport: resized });
    await context.close();
    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(base + invalidPath, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await reducedPage.getByRole('heading', { name: 'Este enlace no está disponible', exact: true }).waitFor();
    assert.equal(await reducedPage.locator('[data-brand-intro]').count(), 0);
    await reduced.close();
    const report = { passed: true, centeredImageBothAxes: true, visualViewportResizeSupported: true,
        reducedMotionPreserved: true, productionAccess: false, credentialsUsed: false, results };
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(report, null, 2));
    console.log('PASS: el logo de la intro queda en el centro real de la pantalla visible, también con barras móviles y cambios de tamaño.');
} finally { await browser.close(); }
