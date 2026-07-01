import { test, expect } from '@playwright/test';

const adminRoutes = [
  '/admin',
  '/admin/stock',
  '/admin/consignaciones',
  '/admin/estadisticas',
  '/admin/reservas',
  '/admin/caja'
];

test.describe('Admin Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login by setting localStorage token
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-jwt-token-for-testing');
    });
  });

  for (const route of adminRoutes) {
    test(`Renderizado de ruta ${route}`, async ({ page }) => {
      // Intercept API calls to prevent DB access and return empty fixture by default
      await page.route('**/api/admin/**', async route => {
        const method = route.request().method();
        if (method === 'GET') {
           // Provide empty fixture to test stable render
           await route.fulfill({
             status: 200,
             contentType: 'application/json',
             path: './tests/fixtures/empty.json'
           });
        } else {
           await route.continue();
        }
      });

      await page.goto(route);
      
      // Check if page loads without crashing
      await expect(page.locator('body')).toBeVisible();
      // Wait for any network idle to ensure components mount
      await page.waitForLoadState('networkidle');
    });
  }
});
