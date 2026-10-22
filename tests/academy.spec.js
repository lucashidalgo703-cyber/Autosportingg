import { test, expect } from '@playwright/test';
import { questions } from '../src/lib/academy/assessments.js';

// Sesión y endpoints exclusivamente ficticios, interceptados antes de navegar.
test.beforeEach(async ({ page, baseURL }) => {
    await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== baseURL) return route.abort();
        if (url.pathname.startsWith('/api/')) {
            const body = url.pathname.includes('/settings') ? { ok: true, settings: { featureFlags: {} } }
                : url.pathname.includes('/auth/me') ? { id: 'academy-test', role: 'ventas' }
                : url.pathname.includes('/subscription-summary') ? {} : [];
            return route.fulfill({ json: body });
        }
        return route.continue();
    });
    await page.addInitScript(() => {
        const payload = btoa(JSON.stringify({ id: 'academy-test', username: 'Alumno ficticio', role: 'ventas', exp: Math.floor(Date.now() / 1000) + 3600 }));
        localStorage.setItem('token', `test.${payload}.test`);
        localStorage.setItem('autosporting_tour_seen_academy-test', 'true');
    });
});

async function noOverflow(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

test('Navega por las seis secciones sin errores y respeta el ancho disponible', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/admin/academy');
    await expect(page.getByRole('heading', { name: 'Aprendé a decidir con números' })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('academy-dashboard.png'), fullPage: true });
    for (const [link, heading] of [['Cursos', 'Cursos financieros'], ['Laboratorio', 'Laboratorio financiero'], ['Evaluaciones', 'Evaluaciones'], ['Mi progreso', 'Mi progreso educativo'], ['Entrenador de decisiones', 'Entrenador de decisiones'], ['Tutor financiero', 'Tutor financiero']]) {
        await page.getByRole('navigation', { name: 'Secciones de Academy' }).getByRole('link', { name: link, exact: true }).click();
        await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
        await noOverflow(page);
    }
    expect(errors).toEqual([]);
});

test('Resuelve una lección, conserva avance al recargar y permite restablecerlo', async ({ page }) => {
    await page.goto('/admin/academy/cursos');
    await page.locator('main').getByRole('textbox').fill('18000000');
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByRole('status')).toContainText('Correcto');
    await page.getByRole('button', { name: 'Completar lección', exact: true }).click();
    await page.goto('/admin/academy/progreso');
    await expect(page.getByText('1 / 24', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('1 / 24', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restablecer progreso', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar restablecimiento' }).click();
    await expect(page.getByText('0 / 24', { exact: true })).toBeVisible();
});

test('Calcula 16 modelos y valida entradas; cronograma cabe en móvil', async ({ page }, testInfo) => {
    await page.goto('/admin/academy/simuladores');
    const select = page.getByRole('combobox');
    const options = await select.locator('option').evaluateAll(nodes => nodes.map(n => n.value));
    expect(options).toHaveLength(16);
    for (const id of options) {
        await select.selectOption(id);
        await expect(page.locator('[aria-live="polite"]').first()).toBeVisible();
        await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
        await noOverflow(page);
    }
    await select.selectOption('cuotas');
    await expect(page.getByRole('table')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('academy-cuotas.png'), fullPage: true });
    await page.locator('main').getByRole('textbox').first().fill('');
    await expect(page.locator('main').getByRole('alert')).toContainText('Completá');
    await page.getByRole('button', { name: 'Restablecer ejemplo ficticio' }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('Corrige evaluación, registra puntaje y abre el curso recomendado', async ({ page }) => {
    await page.goto('/admin/academy/evaluaciones');
    await page.getByRole('button', { name: 'Corregir evaluación' }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('Respondé todas');
    const items = questions.filter(q => q.courseId === 'fundamentos');
    const cards = page.locator('form fieldset');
    for (const [index, item] of items.entries()) {
        if (item.type === 'choice') await cards.nth(index).getByRole('radio').nth(item.correct).check();
        else await cards.nth(index).getByRole('textbox').fill(String(item.correct));
    }
    await page.getByRole('button', { name: 'Corregir evaluación' }).click();
    await expect(page.getByRole('heading', { name: 'Puntaje: 100%' })).toBeVisible();
    await page.getByRole('link', { name: 'Repasar el curso' }).click();
    await expect(page.getByRole('heading', { name: 'Fundamentos financieros', exact: true })).toBeVisible();
    await page.goto('/admin/academy/progreso');
    await expect(page.getByText('Fundamentos financieros: 100%', { exact: true })).toBeVisible();
});

test('Compara decisiones y consulta el tutor sin proveedor externo', async ({ page }) => {
    await page.goto('/admin/academy/entrenador');
    const select = page.getByRole('combobox');
    for (const id of ['comprar', 'descuento', 'financiar', 'permuta', 'distribuir', 'stock-lento']) {
        await select.selectOption(id);
        await page.getByRole('radio').first().check();
        await page.getByRole('button', { name: 'Analizar mi decisión' }).click();
        await expect(page.getByRole('status')).toContainText('hipotéticos');
        await expect(page.getByText('· Tu elección', { exact: false })).toBeVisible();
        await noOverflow(page);
    }
    await page.goto('/admin/academy/tutor');
    await expect(page.getByText('Guía estructurada · No hay IA conectada')).toBeVisible();
    await page.getByRole('button', { name: 'Mostrame un ejemplo numérico' }).click();
    await expect(page.getByRole('log')).toContainText('patrimonio = $13.000.000');
    await page.getByRole('link', { name: 'Abrir lección' }).click();
    await expect(page.getByRole('heading', { name: 'Patrimonio y capital', exact: true })).toBeVisible();
});

test('Abre los ocho cursos y sus lecciones por enlaces directos', async ({ page }, testInfo) => {
    for (const id of ['fundamentos', 'liquidez', 'rentabilidad', 'capital', 'financiacion', 'riesgos', 'inversiones', 'direccion']) {
        await page.goto(`/admin/academy/cursos?curso=${id}&leccion=${id}-3`);
        await expect(page.getByRole('button', { name: 'Lección 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('heading', { name: 'Glosario del curso' })).toBeVisible();
        const courseButtons = page.getByRole('complementary', { name: 'Elegir curso' }).getByRole('button');
        for (const button of await courseButtons.all()) expect(await button.evaluate(node => getComputedStyle(node).color)).not.toBe('rgb(0, 0, 0)');
        await noOverflow(page);
    }
    await page.screenshot({ path: testInfo.outputPath('academy-course.png'), fullPage: true });
});

test('Filtra dificultad, recomienda repaso y recupera progreso local corrupto', async ({ page }) => {
    await page.goto('/admin/academy/evaluaciones');
    await page.getByRole('combobox').first().selectOption('direccion');
    await page.getByRole('combobox').nth(1).selectOption('Inicial');
    await expect(page.locator('form fieldset')).toHaveCount(1);
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Corregir evaluación' }).click();
    await expect(page.getByRole('heading', { name: 'Puntaje: 0%' })).toBeVisible();
    await page.getByRole('link', { name: 'Repasar el curso' }).click();
    await expect(page.getByRole('heading', { name: 'Dirección financiera avanzada', exact: true })).toBeVisible();
    await page.evaluate(() => localStorage.setItem('autosporting.academy.v1:academy-test', '{'));
    await page.goto('/admin/academy/progreso');
    await expect(page.locator('main').getByRole('alert')).toContainText('no se pudo leer');
    await page.getByRole('button', { name: 'Restablecer progreso', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar restablecimiento' }).click();
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('0 / 24', { exact: true })).toBeVisible();
});
