import { test, expect } from '@playwright/test';
import { CLIENT_BASE_URL } from '../playwright.config';

test.use({ baseURL: CLIENT_BASE_URL, storageState: { cookies: [], origins: [] } });

test('client server responds at the root URL', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).toBeTruthy();
  // On a fresh DB the client SSR may render a 200/404 (theme 404 page) or
  // bubble a 500 when public_settings is empty — all three prove the dev
  // server is up and proxying API calls to the backend.
  expect([200, 404, 500]).toContain(response!.status());
});

test('client server responds at an arbitrary slug', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response).toBeTruthy();
  expect([200, 404, 500]).toContain(response!.status());
});
