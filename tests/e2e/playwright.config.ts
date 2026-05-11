import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

// Non-default ports so E2E can coexist with a running dev stack on 5173/4322/8000.
export const ADMIN_PORT = 17533;
export const CLIENT_PORT = 14987;
export const BACKEND_PORT = 18847;

export const ADMIN_BASE_URL = `http://localhost:${ADMIN_PORT}`;
export const CLIENT_BASE_URL = `http://localhost:${CLIENT_PORT}`;
export const BACKEND_BASE_URL = `http://localhost:${BACKEND_PORT}`;
export const API_BASE_URL = `${BACKEND_BASE_URL}/api/v1`;

export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD = '1234';

const STORAGE_STATE = path.join(__dirname, '.auth/admin.json');
export { STORAGE_STATE };

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL: ADMIN_BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'unauth',
      testMatch: /login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth',
      testIgnore: [/login\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
    },
  ],

  webServer: [
    {
      command: `npm exec --workspace=admin -- vite --host --port ${ADMIN_PORT}`,
      cwd: repoRoot,
      env: {
        VITE_PUBLIC_BACKEND: BACKEND_BASE_URL,
      },
      port: ADMIN_PORT,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
    {
      command: `npm exec --workspace=client -- astro dev --host 0.0.0.0 --port ${CLIENT_PORT}`,
      cwd: repoRoot,
      env: {
        E2E_BACKEND_URL: BACKEND_BASE_URL,
        PUBLIC_URL: BACKEND_BASE_URL,
      },
      port: CLIENT_PORT,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
  ],
});
