import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'min-PC', width: 1280, height: 800 },
  { name: 'standard-PC', width: 1440, height: 900 },
  { name: 'max-PC', width: 2560, height: 1440 },
] as const;

for (const viewport of viewports) {
  test(`keeps the dashboard usable at ${viewport.name}`, async ({ page }) => {
    await page.route('http://localhost:3000/**', async (route) => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    });
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.locator('.dashboard-navigation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SEO Dashboard' })).toBeVisible();

    for (const label of ['Rank Tracker', 'Audit Site', 'Settings']) {
      await page.getByRole('button', { name: label }).click();
      await expect(page.getByRole('heading', { name: label })).toBeVisible();
    }

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(viewport.width);
  });
}
