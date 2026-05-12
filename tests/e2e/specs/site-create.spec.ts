import { test, expect } from '@playwright/test';

test('SiteCreate stepper walks Theme → Basic Info → Languages → AI → submit', async ({ page }) => {
  const siteName = `E2E Site ${Date.now()}`;

  await page.goto('/admin/sites/new');
  await expect(page.getByRole('heading', { name: /create new website/i })).toBeVisible();

  // Step 0: Choose Theme — pick the seeded starter_react theme card.
  const themeCard = page.getByRole('heading', { name: 'Starter React' });
  await themeCard.waitFor({ state: 'visible' });
  await themeCard.click();
  await page.getByRole('button', { name: /next step/i }).click();

  await page.getByLabel('Website Name').fill(siteName);

  const domainsInput = page.getByPlaceholder(/Enter domain and press Enter/i);
  await domainsInput.fill('e2e.example.com');
  await domainsInput.press('Enter');
  await expect(page.getByText('e2e.example.com')).toBeVisible();

  await page.getByRole('button', { name: /next step/i }).click();

  const availableLangs = page.getByRole('textbox', { name: 'Available Languages' });
  await expect(availableLangs).toBeVisible();
  await availableLangs.click();
  await page.getByRole('option').first().click();
  await page.keyboard.press('Escape');

  await page.getByRole('textbox', { name: 'Default Language' }).click();
  await page.getByRole('option').first().click();

  await page.getByRole('button', { name: /next step/i }).click();

  await expect(page.getByLabel('OpenRouter API Key')).toBeVisible();

  await page.getByRole('button', { name: /create website/i }).click();

  // Success path navigates away from /sites/new. The exact target depends on
  // org-switching logic (typically /site-settings, but can land on /pages
  // after refreshOrganizations re-evaluates the active org).
  await expect(page).not.toHaveURL(/\/admin\/sites\/new/, { timeout: 15_000 });
});
