# Development

## Table of Contents
- [Development](#development-1)
  - [Running the backend](#running-the-backend)
  - [Running the client](#running-the-client)
  - [Running the admin](#running-the-admin)
  - [Theme development](#theme-development)
- [Local package development](#local-package-development)
  - [Setup](#setup)
  - [Dev workflow notes](#dev-workflow-notes)

## Development

There are 2 parts to this project that can be run locally:

1. The FastAPI backend (referred to as "backend")
2. The Astro website client (referred to as "client")

The admin panel is bundled into the client and served at `/admin` — you only need to run it separately if you're developing the admin itself.

There are also 3 npm packages published from this repo:

1. `@deepsel/cms-utils`, which provides shared utilities for the client and themes.
2. `@deepsel/cms-react`, which provides pre-built React components, hooks, and utilities for themes.
3. `@deepsel/admin`, which provides the admin panel for the CMS.

To edit these packages locally, head to the [Local package development](#local-package-development) section.

### Running the backend

Create your `.env` file:

```bash
cp .env.sample .env
```

By default, the backend builds and starts the Astro client on port 4321 and serves it alongside the API. To disable this (recommended in development):

```bash
# In .env
NO_CLIENT=true
```

Start the database:

```bash
docker-compose -f local.docker-compose.yml up -d
```

Run the backend:

```bash
# (Optional) create a virtual environment
# python -m venv .venv
# source .venv/bin/activate

# Install dependencies
make install-dev

# Run the backend
uvicorn main:app --reload
```

### Running the client

Install dependencies at the **root** level:
```bash
# From the root folder
npm install
```

Run the client:
```bash
# Also from the root folder
npm run dev --workspace=client
```

### Running the admin (optional)

The admin is bundled into the client at path `/admin` and served at `http://localhost:4321/admin`. You only need to run the admin dev server if you're developing the admin itself:

```bash
# Run hot reload admin panel at http://localhost:5173
cd admin && npm run dev
```

### Session & authentication

The backend uses **server-side sessions** with httpOnly cookies. On login, the backend creates a session and sets a `session_id` cookie. The admin frontend sends this cookie automatically via `credentials: 'include'`.

**Session store** auto-detects the best backend in this order:
1. **Redis** — if `REDIS_URL` is set
2. **PostgreSQL** — uses the existing database (creates `auth_session` table)
3. **Filesystem** — fallback, stores JSON files in `SESSION_DIR`

You can force a backend with `SESSION_STORE=redis|postgres|filesystem`.

**Local dev cookie setup:**  
In local dev, the admin panel runs on the Astro client and API calls go through the Astro proxy (`/api/v1` → `localhost:8000`), so cookies work on the same origin. You must set `SESSION_COOKIE_SECURE=false` in your `.env` since local dev uses HTTP, not HTTPS:

```bash
# In your .env file
SESSION_COOKIE_SECURE=false
```

Without this, the browser will reject the cookie (Secure cookies require HTTPS).

**Bearer token fallback:**  
The backend still supports `Authorization: Bearer <jwt>` for API clients. Browser-based admin uses cookies; external API clients can use JWT tokens from `POST /api/v1/token`.

### Theme development

Simply make changes to the theme files in the `themes/` directory, and the client hot reloads your changes.

See [themes/ThemeDevelopment.md](themes/ThemeDevelopment.md) for detailed theme authoring docs.

## Local package development

If you need to develop the `deepsel` pip package locally, clone it as a sibling folder:
```bash
git clone git@github.com:DeepselSystems/deepsel.git
```
Link the package:
```bash
pip install -e ../deepsel
```
This editable install creates a link to your source code, so changes are immediately reflected in the other project's venv.


To go back to using the published pip package instead of your local version:

```bash
# Reinstall deepsel from pip (replaces the local editable install)
pip install deepsel --upgrade
```

### Dev workflow notes

- **cms-utils / cms-react** — part of the npm workspace, changes are picked up immediately by Astro HMR
- **admin** — a built library, **not** picked up by HMR. You must rebuild after every code change. Two options:
  - **Watch mode (recommended):** run `npm run dev:admin` in a separate terminal — auto-rebuilds on save
  - **Manual:** `cd admin && npm run build:lib`
- **deepsel (pip)** — changes are picked up immediately, just restart the backend server
