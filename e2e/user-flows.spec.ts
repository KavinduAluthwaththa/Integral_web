import { expect, test } from '@playwright/test';

test.describe('public user flows', () => {
  test('home to shop navigation and product grid shell', async ({ page }) => {
    await page.goto('/');

    const visitShopLink = page.getByRole('link', { name: /visit shop/i });
    await expect(visitShopLink).toBeVisible();
    await visitShopLink.click();

    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByPlaceholder('Search by name, SKU, category, or color')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('login and signup forms render with expected fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('static seo endpoints are available', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    await expect(robots.text()).resolves.toMatch(/User-Agent/i);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    await expect(sitemap.text()).resolves.toContain('<urlset');
  });
});
