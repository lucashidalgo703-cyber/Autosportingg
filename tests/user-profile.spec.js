import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Mobile', width: 390, height: 844 } // iPhone 12 Pro dimensions as requested 390x844
];

test.describe('Menú de Perfil (UserProfileMenu)', () => {
    test.beforeEach(async ({ page }) => {
        // Asume un flujo de login de test
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@autosporting.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/admin');
        await page.waitForLoadState('networkidle');
    });

    for (const vp of viewports) {
        test.describe(`Viewport: ${vp.name}`, () => {
            test.use({ viewport: vp });

            test('Se renderiza correctamente y se abre/cierra', async ({ page }) => {
                const trigger = page.locator('button[aria-haspopup="menu"]');
                await expect(trigger).toBeVisible();

                // Verificar estado inicial cerrado
                await expect(trigger).toHaveAttribute('aria-expanded', 'false');

                // Abrir menú
                await trigger.click();
                await expect(trigger).toHaveAttribute('aria-expanded', 'true');
                const menu = page.locator('div[role="menu"]');
                await expect(menu).toBeVisible();
                
                // Screenshot del menú abierto
                await page.screenshot({ path: `screenshots/user-profile-menu-${vp.name.toLowerCase()}.png` });

                // Cerrar menú con clic fuera
                await page.click('body', { position: { x: 0, y: 0 } });
                await expect(menu).not.toBeVisible();
                await expect(trigger).toHaveAttribute('aria-expanded', 'false');

                // Abrir y cerrar con Escape
                await trigger.click();
                await expect(menu).toBeVisible();
                await page.keyboard.press('Escape');
                await expect(menu).not.toBeVisible();
            });

            test('Verifica las opciones del menú y navegación', async ({ page }) => {
                const trigger = page.locator('button[aria-haspopup="menu"]');
                await trigger.click();

                const menu = page.locator('div[role="menu"]');
                await expect(menu).toBeVisible();

                // Opción Mi Perfil
                const profileLink = menu.locator('a:has-text("Mi perfil")');
                await expect(profileLink).toBeVisible();
                await profileLink.click();
                
                // Validar navegación
                await expect(page).toHaveURL(/.*\/admin\/configuracion\/perfil/);
                // Validar que el menú se cerró
                await expect(menu).not.toBeVisible();
            });
            
            test('Cambiar tema', async ({ page }) => {
                const trigger = page.locator('button[aria-haspopup="menu"]');
                await trigger.click();
                
                const themeBtn = page.locator('button:has-text("Cambiar a modo")');
                await expect(themeBtn).toBeVisible();
                await themeBtn.click();
                
                // Screenshot tema diferente
                await trigger.click(); // Re-abrir por si se cerró, aunque la acción depende de cómo maneja ThemeContext
                await page.screenshot({ path: `screenshots/user-profile-menu-theme-changed-${vp.name.toLowerCase()}.png` });
            });
        });
    }
});
