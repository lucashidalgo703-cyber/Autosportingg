import { test, expect } from '@playwright/test';

// Utilidad para tomar capturas en múltiples viewports
const viewports = [
  { name: 'Mobile', width: 360, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 }
];

test.describe('Certificación Visual del Manual de Ayuda', () => {
    
    // Login inicial (ajustar credenciales según entorno dev)
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        // Suponiendo que hay un formulario de login con id email y password
        await page.fill('input[type="email"]', 'admin@autosporting.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');
    });

    for (const vp of viewports) {
        test(`Capturas de Pantalla en ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            
            // Ir al manual
            await page.goto('/admin/ayuda');
            await page.waitForTimeout(1000); // Dar tiempo a animaciones
            
            // 1. Índice normal
            await page.screenshot({ path: `screenshots/ayuda-indice-${vp.name}.png`, fullPage: true });

            // 2. Tema Oscuro (Si está implementado en el DOM, forzamos un atributo de clase)
            await page.evaluate(() => document.documentElement.classList.add('dark'));
            await page.screenshot({ path: `screenshots/ayuda-indice-dark-${vp.name}.png`, fullPage: true });
            await page.evaluate(() => document.documentElement.classList.remove('dark'));

            // 3. Búsqueda con resultados
            await page.fill('input[placeholder*="Buscar"]', 'stock');
            await page.waitForTimeout(500); // Esperar reactividad
            await page.screenshot({ path: `screenshots/ayuda-busqueda-resultados-${vp.name}.png`, fullPage: true });

            // 4. Búsqueda vacía (EmptyState)
            await page.fill('input[placeholder*="Buscar"]', 'xxxxxx_not_found');
            await page.waitForTimeout(500);
            await page.screenshot({ path: `screenshots/ayuda-busqueda-vacia-${vp.name}.png`, fullPage: true });

            // 5. Artículo abierto
            await page.fill('input[placeholder*="Buscar"]', '');
            await page.goto('/admin/ayuda?tema=stock');
            await page.waitForTimeout(1000); // Esperar scroll o expansión
            await page.screenshot({ path: `screenshots/ayuda-articulo-abierto-${vp.name}.png`, fullPage: true });
        });
    }
});
