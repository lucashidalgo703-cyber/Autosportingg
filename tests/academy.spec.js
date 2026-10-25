import { test, expect } from '@playwright/test';
import { questions } from '../src/lib/academy/assessments.js';
import { courseCases } from '../src/lib/academy/courseCases.js';

// Sesión y endpoints exclusivamente ficticios, interceptados antes de navegar.
test.beforeEach(async ({ page, baseURL }) => {
    await page.context().route('**/*', async route => {
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
    await page.context().addInitScript(() => {
        const id = localStorage.getItem('academy-test-learner') || 'academy-test';
        const payload = btoa(JSON.stringify({ id, username: 'Alumno ficticio', role: 'ventas', exp: Math.floor(Date.now() / 1000) + 3600 }));
        localStorage.setItem('token', `test.${payload}.test`);
        localStorage.setItem(`autosporting_tour_seen_${id}`, 'true');
    });
});

test('Dos pestañas sincronizan avances concurrentes, reset e identidad separada', async ({ page, context }) => {
    const other = await context.newPage();
    await page.goto('/admin/academy/cursos?curso=fundamentos&leccion=fundamentos-1');
    await other.goto('/admin/academy/cursos?curso=fundamentos&leccion=fundamentos-2');
    await page.locator('main form').first().getByRole('textbox').fill('18000000');
    await other.locator('main form').first().getByRole('textbox').fill('3000000');
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await other.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await Promise.all([page.getByRole('button', { name: 'Completar lección', exact: true }).click(), other.getByRole('button', { name: 'Completar lección', exact: true }).click()]);
    await page.getByRole('navigation', { name: 'Secciones de Academy' }).getByRole('link', { name: 'Mi progreso', exact: true }).click();
    await other.getByRole('navigation', { name: 'Secciones de Academy' }).getByRole('link', { name: 'Mi progreso', exact: true }).click();
    await expect(page.getByText('2 / 24', { exact: true })).toBeVisible();
    await expect(other.getByText('2 / 24', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Restablecer progreso', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar restablecimiento' }).click();
    await expect(other.getByText('0 / 24', { exact: true })).toBeVisible();
    await page.goto('/admin/academy/cursos?curso=fundamentos&leccion=fundamentos-1');
    await page.locator('main form').first().getByRole('textbox').fill('18000000');
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await page.getByRole('button', { name: 'Completar lección', exact: true }).click();
    await expect(other.getByText('1 / 24', { exact: true })).toBeVisible();
    await page.evaluate(() => localStorage.setItem('academy-test-learner', 'otro-alumno'));
    await page.goto('/admin/academy/progreso');
    await expect(page.getByText('0 / 24', { exact: true })).toBeVisible();
    await expect(other.getByText('1 / 24', { exact: true })).toBeVisible();
    await other.close();
});

test('Casos integrados se resuelven y los límites económicos se explican en pantalla', async ({ page }) => {
    for (const id of ['fundamentos', 'direccion']) {
        await page.goto(`/admin/academy/cursos?curso=${id}`);
        await page.locator('details summary').click();
        const fields = page.locator('details').getByRole('textbox');
        for (const [index, exercise] of courseCases[id].exercises.entries()) await fields.nth(index).fill(String(exercise.answer));
        await page.getByRole('button', { name: 'Corregir caso integrado' }).click();
        await expect(page.locator('details').getByRole('status')).not.toContainText('Para revisar');
        await expect(page.locator('details').getByRole('status')).toContainText('Correcto');
        await noOverflow(page);
    }
    await page.goto('/admin/academy/simuladores');
    await page.getByRole('combobox').selectOption('rotacion');
    await page.locator('main').getByRole('textbox').first().fill('0');
    await expect(page.locator('main').getByText('No definido', { exact: true })).toBeVisible();
    await page.getByRole('combobox').selectOption('recuperacion');
    await page.locator('main').getByRole('textbox').nth(1).fill('0');
    await expect(page.locator('main').getByText('No se recupera', { exact: true })).toBeVisible();
    await page.getByRole('combobox').selectOption('cuotas');
    await page.locator('main').getByRole('textbox').nth(1).fill('10');
    await page.locator('main').getByRole('textbox').nth(2).fill('600');
    const payments = await page.getByRole('table').locator('tbody tr td:nth-child(2)').allTextContents();
    expect(new Set(payments).size).toBe(1);
    await page.locator('main').getByRole('textbox').first().fill('0x10');
    await expect(page.locator('main').getByRole('alert')).toContainText('decimales');
});

async function noOverflow(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
}

test('Academy usa un shell educativo sin cargar endpoints operativos del CRM', async ({ page }) => {
    const adminApiRequests = [];
    page.on('request', request => {
        const pathname = new URL(request.url()).pathname;
        if (pathname.startsWith('/api/admin/')) adminApiRequests.push(pathname);
    });

    await page.goto('/admin/academy');
    await expect(page.locator('[data-academy-shell]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al CRM' })).toBeVisible();
    await expect(page.getByPlaceholder('Buscar clientes, vehículos, ventas…')).toHaveCount(0);
    await expect(page.getByText('USD 0', { exact: true })).toHaveCount(0);

    for (const link of ['Cursos', 'Laboratorio', 'Evaluaciones', 'Mi progreso', 'Entrenador de decisiones', 'Tutor financiero']) {
        await page.getByRole('navigation', { name: 'Secciones de Academy' }).getByRole('link', { name: link, exact: true }).click();
    }

    expect(adminApiRequests).toEqual(['/api/admin/auth/me']);
});

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
