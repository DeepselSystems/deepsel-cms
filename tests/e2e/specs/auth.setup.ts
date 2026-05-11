import { test as setup, expect } from '@playwright/test';
import { ADMIN_USERNAME, ADMIN_PASSWORD, STORAGE_STATE } from '../playwright.config';

setup('authenticate', async ({ page }) => {
  await page.goto('/admin/login');

  const loginPanel = page.getByRole('tabpanel', { name: 'Login' });
  await loginPanel.getByLabel('Email or Username').fill(ADMIN_USERNAME);
  await loginPanel.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await loginPanel.getByRole('button', { name: 'Login', exact: true }).click();

  await page.waitForURL('**/admin/pages', { timeout: 15_000 });
  await expect(page).toHaveURL(/\/admin\/pages/);

  await page.context().storageState({ path: STORAGE_STATE });
});
