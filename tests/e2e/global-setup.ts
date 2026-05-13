import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_BASE_URL, BACKEND_PORT } from './playwright.config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const backendDir = path.join(repoRoot, 'backend');

declare global {
  // eslint-disable-next-line no-var
  var __e2ePostgres: StartedPostgreSqlContainer | undefined;
  // eslint-disable-next-line no-var
  var __e2eBackend: ChildProcess | undefined;
}

async function waitForBackend(url: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as { status?: string };
        if (body.status === 'ok') return;
      }
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend did not become healthy at ${url} within ${timeoutMs}ms: ${lastErr}`);
}

export default async function globalSetup(): Promise<void> {
  console.log('[e2e setup] starting Postgres testcontainer...');
  const pg = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('deepsel_e2e')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  globalThis.__e2ePostgres = pg;

  const host = pg.getHost();
  const port = pg.getMappedPort(5432);
  const dbName = pg.getDatabase();
  const dbUser = pg.getUsername();
  const dbPassword = pg.getPassword();

  console.log(`[e2e setup] Postgres ready at ${host}:${port}/${dbName}`);

  const env = {
    ...process.env,
    DB_HOST: host,
    DB_PORT: String(port),
    DB_NAME: dbName,
    DB_USER: dbUser,
    DB_PASSWORD: dbPassword,
    DATABASE_URL: `postgresql+psycopg2://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`,
    NO_CLIENT: 'true',
    ENABLE_GRAPHQL: 'false',
    APP_SECRET: 'e2e-test-secret',
    SESSION_STORE_BACKEND: 'filesystem',
    SESSION_COOKIE_SECURE: 'false',
    LOG_LEVEL: 'WARNING',
  };

  console.log(`[e2e setup] starting backend (uvicorn) on port ${BACKEND_PORT}...`);
  const venvUvicorn = path.join(repoRoot, '.venv/bin/uvicorn');
  const backend = spawn(
    venvUvicorn,
    ['main:app', '--host', '0.0.0.0', '--port', String(BACKEND_PORT)],
    {
      cwd: backendDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  globalThis.__e2eBackend = backend;

  backend.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backend.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[e2e setup] backend exited with code ${code}`);
    }
  });

  await waitForBackend(`${API_BASE_URL}/util/health`);
  console.log('[e2e setup] backend healthy, ready for tests');
}
