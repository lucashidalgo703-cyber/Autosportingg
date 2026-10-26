import { test, expect } from '@playwright/test';

const session = `test.${Buffer.from(JSON.stringify({ id: 'auth-browser', role: 'admin', exp: 4102444800 })).toString('base64url')}.test`;

for (const initialFailure of [503, 'offline']) {
    test(`Bloquea ${initialFailure}, conserva token y recupera por reintento sin bucles`, async ({ context, page, baseURL }, testInfo) => {
        let failure = initialFailure;
        let authRequests = 0;
        const operationalRequests = [];
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== baseURL) return route.abort();
            if (url.pathname === '/api/admin/auth/me') {
                authRequests++;
                expect(route.request().headers().authorization).toBe(`Bearer ${session}`);
                if (failure === 'offline') return route.abort();
                if (failure === 503) return route.fulfill({ status: 503, json: { message: 'Service unavailable (fixture)' } });
                return route.fulfill({ json: { ok: true, user: { id: 'auth-browser', role: 'admin' }, hasValidObjectId: false } });
            }
            if (url.pathname.startsWith('/api/')) {
                operationalRequests.push(url.pathname);
                return route.abort();
            }
            return route.continue();
        });
        await context.addInitScript(session => localStorage.setItem('token', session), session);
        await page.goto('/admin/academy');
        await expect(page.getByRole('heading', { name: 'Error de Conexión con el Servidor' })).toBeVisible();
        await expect(page.locator('[data-academy-shell]')).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(session);
        await page.screenshot({ path: testInfo.outputPath('auth-blocked.png'), fullPage: true });
        failure = null;
        await page.getByRole('button', { name: 'Reintentar Verificación' }).click();
        await expect(page.locator('[data-academy-shell]')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Aprendé a decidir con números' })).toBeVisible();
        await page.getByRole('navigation', { name: 'Secciones de Academy' }).getByRole('link', { name: 'Cursos', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Cursos financieros' })).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/academy\/cursos$/);
        expect(authRequests).toBe(2);
        expect(operationalRequests).toEqual([]);
        expect(errors).toEqual([]);
    });
}
