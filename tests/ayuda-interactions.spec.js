import { test, expect } from '@playwright/test';

test.describe('Manual de Ayuda - Interacciones', () => {
    test.beforeEach(async ({ page }) => {
        // Asumiendo un flujo de login de prueba para el entorno local
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@autosporting.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');
        
        // Ir a la página de ayuda
        await page.goto('/admin/ayuda');
        await page.waitForLoadState('networkidle');
    });

    test('Los 40 capítulos deben estar cerrados inicialmente', async ({ page }) => {
        // Contar el número total de capítulos renderizados
        const buttons = page.locator('button[aria-expanded]');
        const count = await buttons.count();
        expect(count).toBe(40);
        
        // Verificar que todos estén cerrados
        for (let i = 0; i < count; i++) {
            await expect(buttons.nth(i)).toHaveAttribute('aria-expanded', 'false');
        }
    });

    test('Abrir y cerrar un capítulo individual', async ({ page }) => {
        const firstChapterBtn = page.locator('button[aria-expanded]').first();
        const controlsId = await firstChapterBtn.getAttribute('aria-controls');
        const content = page.locator(`#${controlsId}`);
        
        // Estado cerrado
        await expect(firstChapterBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(content).toHaveAttribute('aria-hidden', 'true');
        
        // Click para abrir
        await firstChapterBtn.click();
        await expect(firstChapterBtn).toHaveAttribute('aria-expanded', 'true');
        await expect(content).toHaveAttribute('aria-hidden', 'false');
        
        // Click para cerrar
        await firstChapterBtn.click();
        await expect(firstChapterBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(content).toHaveAttribute('aria-hidden', 'true');
    });

    test('Expandir y colapsar todos', async ({ page }) => {
        const expandBtn = page.locator('button[title="Expandir todo"]');
        const collapseBtn = page.locator('button[title="Colapsar todo"]');
        
        await expandBtn.click();
        
        // Todos deberían estar abiertos
        const buttons = page.locator('button[aria-expanded]');
        const count = await buttons.count();
        expect(count).toBe(40);
        
        for (let i = 0; i < count; i++) {
            await expect(buttons.nth(i)).toHaveAttribute('aria-expanded', 'true');
        }
        
        // Colapsar todo
        await collapseBtn.click();
        for (let i = 0; i < count; i++) {
            await expect(buttons.nth(i)).toHaveAttribute('aria-expanded', 'false');
        }
    });

    test('Búsqueda con acentos y mayúsculas', async ({ page }) => {
        const searchInput = page.locator('input[aria-label="Buscar en el manual"]');
        
        // Buscar con acento
        await searchInput.fill('Vehículos');
        await page.waitForTimeout(300);
        
        // Debe haber resultados
        let resultsCount = await page.locator('button[aria-expanded]').count();
        expect(resultsCount).toBeGreaterThan(0);
        
        // Limpiar
        await page.locator('button[aria-label="Limpiar búsqueda"]').click();
        
        // Buscar sin acento y minúsculas
        await searchInput.fill('vehiculos');
        await page.waitForTimeout(300);
        
        const newResultsCount = await page.locator('button[aria-expanded]').count();
        expect(newResultsCount).toBe(resultsCount);
    });

    test('Estado sin resultados', async ({ page }) => {
        const searchInput = page.locator('input[aria-label="Buscar en el manual"]');
        await searchInput.fill('xyz123abcNoExiste');
        await page.waitForTimeout(300);
        
        const emptyState = page.locator('text=No encontramos resultados');
        await expect(emptyState).toBeVisible();
    });

    test('Navegación desde el índice', async ({ page }) => {
        // Encontrar un chip del índice
        const chip = page.locator('button.rounded-full:has-text("Mi Espacio")');
        await expect(chip).toBeVisible();
        
        await chip.click();
        
        // El capítulo correspondiente debería haberse expandido
        const chapterBtn = page.locator('button[aria-expanded]:has-text("Mi Espacio")');
        await expect(chapterBtn).toHaveAttribute('aria-expanded', 'true');
    });

    test('Funcionamiento mediante teclado', async ({ page }) => {
        // Tabular hasta el buscador
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab'); // Ajustar dependiendo de la estructura real del focus
        
        // Ir a un botón del índice
        await page.locator('button.rounded-full').first().focus();
        await page.keyboard.press('Enter');
        
        // Debería haberse expandido el primer capítulo
        const firstChapterBtn = page.locator('button[aria-expanded]').first();
        await expect(firstChapterBtn).toHaveAttribute('aria-expanded', 'true');
    });
});
