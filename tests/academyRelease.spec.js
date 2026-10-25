import { test, expect } from '@playwright/test';

const routes = ['/admin/academy', ...['cursos', 'simuladores', 'evaluaciones', 'progreso', 'entrenador', 'tutor'].map(section => `/admin/academy/${section}`)];
const token = exp => `test.${Buffer.from(JSON.stringify({ id: 'release-test', role: 'admin', exp })).toString('base64url')}.test`;

test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
        await page.screenshot({ path: testInfo.outputPath('failure.png'), fullPage: true });
    }
});

async function isolate(context, baseURL, session, authResult) {
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== baseURL) return route.abort();
        if (url.pathname.startsWith('/api/')) {
            if (url.pathname === '/api/admin/auth/me') {
                return authResult === 'offline' ? route.abort() : route.fulfill({ status: authResult, json: { id: 'release-test', role: 'admin' } });
            }
            const json = url.pathname.includes('settings') ? { ok: true, settings: { featureFlags: {} } } : [];
            return route.fulfill({ json });
        }
        return route.continue();
    });
    await context.addInitScript(session => {
        localStorage.removeItem('token');
        if (session) localStorage.setItem('token', session);
        localStorage.setItem('autosporting_tour_seen_release-test', 'true');
    }, session);
}

for (const [name, session, response] of [
    ['sin token', null, 200],
    ['token malformado', 'invalid', 200],
    ['token vencido', token(1), 200],
    ['sesión rechazada 401', token(4102444800), 401],
    ['sesión rechazada 403', token(4102444800), 403],
    ['servidor 503', token(4102444800), 503],
    ['sin conexión', token(4102444800), 'offline'],
]) {
    test(`Acceso protegido: ${name}`, async ({ context, page, baseURL }) => {
        await isolate(context, baseURL, session, response);
        for (const route of routes) {
            await page.goto(route);
            await expect(page).toHaveURL(/\/login$/);
            await expect(page.locator('[data-academy-shell]')).toHaveCount(0);
        }
    });
}

test('Una sesión administrativa validada conserva el shell general fuera de Academy', async ({ context, page, baseURL }) => {
    await isolate(context, baseURL, token(4102444800), 200);
    for (const route of ['/admin', '/admin/stock', '/admin/ventas', '/admin/tesoreria']) {
        await page.goto(route);
        await expect(page).toHaveURL(new URL(route, baseURL).href);
        await expect(page.locator('[data-admin-shell]')).toBeVisible();
        await expect(page.locator('[data-academy-shell]')).toHaveCount(0);
    }
    await page.goto('/admin/academy');
    await expect(page.locator('[data-academy-shell]')).toBeVisible();
    await page.getByRole('link', { name: 'Volver al CRM' }).click();
    await expect(page.locator('[data-admin-shell]')).toBeVisible();
});
