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
      // Intercept API calls to prevent DB access and return fixtures
      await page.route('**/api/admin/**', async route => {
        const method = route.request().method();
        if (method === 'GET') {
           // Provide basic empty fixture
           await route.fulfill({
             status: 200,
             contentType: 'application/json',
             body: JSON.stringify({ data: [], summary: {}, total: 0, cars: [], mandates: [], movements: [] })
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
