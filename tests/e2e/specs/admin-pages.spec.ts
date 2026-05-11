import { test, expect } from '@playwright/test';

test('authenticated user lands on pages list', async ({ page }) => {
  await page.goto('/admin/pages');

  await expect(page).toHaveURL(/\/admin\/pages/);
  await expect(page.locator('body')).not.toContainText('Email or Username');
});

test('navigation to sites/new renders SiteCreate stepper', async ({ page }) => {
  await page.goto('/admin/sites/new');

  await expect(page.getByRole('heading', { name: /create new website/i })).toBeVisible();
  await expect(page.getByText(/basic information/i).first()).toBeVisible();
});
