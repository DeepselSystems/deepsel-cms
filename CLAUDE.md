# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deepsel CMS is a full-stack content management system organized as an npm monorepo:

- **`backend/`** — FastAPI (Python 3.12) REST API + GraphQL, PostgreSQL, SQLAlchemy 2.0
- **`admin/`** — React 18 + Vite admin dashboard (Mantine UI, Tiptap editor, Zustand)
- **`client/`** — Astro 5 server-rendered public website
- **`themes/`** — Astro-based themes consumed by the client (e.g. `themes/starter_react/`)
- **`packages/`** — Shared npm packages (`@deepsel/cms-react`, `@deepsel/cms-utils`) published to npm
- **`mcp/`** — MCP server exposing CMS operations to AI clients (FastMCP + httpx)

## Commands

### Backend (run from `backend/`)

```bash
make install-dev        # Install with dev dependencies
make test               # Run pytest with coverage
make lint               # flake8 linting
make security           # bandit security scan
make format             # black formatting
make format-check       # check formatting without changes
make prepush            # lint + security + format-check + test (must pass before committing)
make reset_db           # reset database via docker compose
uvicorn main:app --reload  # run dev server
```

Run a single test file:

```bash
pytest apps/core/tests/test_crud_user.py
```

### Admin (run from `admin/`)

```bash
npm run dev             # Vite dev server (port 5173)
npm run build
npm run lint
npm run lint:fix
npm run format
```

### Client (run from `client/`)

```bash
npm run dev             # Astro dev server (port 4322)
npm run build
npm run format
```

### Monorepo root

```bash
npm run build           # builds client
npm run format          # format all
npm run prepush         # pre-push checks for packages
```

## Local Development Setup

```bash
# Backend
cd backend
cp .env.sample .env
docker-compose -f local.docker-compose.yml up -d   # starts PostgreSQL 17
make install-dev
npm install                                          # for JSX compilation via esbuild
uvicorn main:app --reload

# Frontend (from repo root)
npm install                                          # install all workspaces

# Admin
cd admin && npm run dev

# Client
cd client && npm run dev
```

The client proxies `/api/v1` to `http://localhost:8000`. Default login: `admin` / `1234`.

### Backend Environment Variables

Key env vars in `backend/.env.sample` (beyond DB/auth config):

- **`LOCAL_PACKAGES`** (`false`) — Set to `true` to build `@deepsel` packages from local source instead of npm
- **`NO_CLIENT`** (`false`) — Set to `true` to skip starting the Astro client (useful when running the client separately via `cd client && npm run dev`)
- **`CLIENT_HOST`** (`0.0.0.0`) — Host for the Astro client server
- **`CLIENT_PORT`** (`4321`) — Port for the Astro client server
- **`ONLY_MIGRATE`** (`false`) — Run DB migrations only and exit (for K8s init containers)
- **`NO_MIGRATE`** (`false`) — Skip DB migrations and startup logic (for K8s main containers)

## After Making Edits

Both prepush scripts must pass before committing. Run them from the repo root:

```bash
source .venv/bin/activate && npm run prepush && cd backend && make prepush
```

- **`npm run prepush`** (repo root) — runs `prepush` in `packages/cms-utils` (vitest + tsc + eslint + prettier) and `packages/cms-react` (vitest + tsc + eslint + prettier), then builds the admin lib. Run after changes to `packages/` or `admin/`.
- **`make prepush`** (from `backend/`) — runs flake8 lint, bandit security scan, black format-check, and pytest with coverage. Run after any backend changes.

## Architecture

### Backend App System

The backend uses a modular app system with three installed apps (defined in `settings.py`):

1. **`core`** — Core framework: users, roles, organizations, auth, attachments
2. **`locales`** — i18n: countries, currencies, locales
3. **`cms`** — Content management: pages, blog posts, menus, themes, templates

Each app follows a standard structure: `apps/{name}/{models,routers,data,types,utils,tests}/`. Apps are dynamically discovered at startup — `install_apps.py` scans each app's `routers/` directory and registers them, then loads seed data from `data/` CSVs.

### ORM & Model System

SQLAlchemy 2.0 models use a mixin composition pattern:

- **`ORMBaseMixin`** — Core CRUD operations (`create`, `update`, `delete`, `search`, `get_one`) with built-in permission checking. All models get `created_at`, `updated_at`, `string_id`, `active`, `system` columns.
- **`OrganizationMetaDataMixin`** — Multi-tenancy via `organization_id`
- **`ActivityMixin`** — Change tracking for specified fields
- **`BaseModel`** = ORMBaseMixin + OrganizationMetaDataMixin

The **models pool** (`models_pool.py`) dynamically loads all models from installed apps and maps `__tablename__` → model class. This registry drives both the auto-generated GraphQL schema and dynamic CRUD operations.

### Permission System

Scope-based (`none`, `own`, `org`, `own_org`, `all`) × action-based (`read`, `write`, `delete`, `create`, `all`). Permissions are checked in every CRUD operation via `_check_has_permission()`. Roles support recursive inheritance through `implied_roles`.

### Auto-Generated GraphQL

Strawberry GraphQL schema is generated at startup from the models pool — no manual type definitions. For each model it creates query resolvers (`get_{model}`, `search_{model}`) and mutation resolvers (`create_{model}`, `update_{model}`, `delete_{model}`, `bulk_delete_{model}`). Endpoint: `/graphql`.

### Package Hoisting (npm Workspaces)

The root `package.json` defines npm workspaces: `client`, `admin`, `themes/*`, and `packages/*`. Running `npm install` from the repo root hoists shared dependencies into the root `node_modules/`, making them available to all workspaces without duplicating installs.

Themes declare shared dependencies like `react` and `react-dom` as `peerDependencies` — they resolve these from the root `node_modules/` where the client workspace installs them. Theme-specific dependencies go in `dependencies` in the theme's own `package.json`. The `overrides` field in the root `package.json` enforces a single React version across workspaces (e.g., `@mui/*` packages use the root React).

When adding dependencies:
- **Shared across workspaces** (react, react-dom): install in the consuming workspace (client) and declare as `peerDependencies` in themes
- **Theme-specific**: add to the theme's `dependencies`
- **Dev tooling** (prettier, happy-dom): add to root `devDependencies`
- Always run `npm install` from the repo root to ensure proper hoisting

### Theme System

Themes live in `themes/{name}/` and follow a standard structure:

```
themes/{name}/
├── theme.json           # Metadata (name, description, preview)
├── package.json         # Theme-specific dependencies
├── Index.astro          # Home page template (required)
├── page.astro           # Generic page template (required)
├── Blog.astro           # Blog list (required)
├── single-blog.astro    # Blog post (required)
├── search.astro         # Search results (required)
├── 404.astro            # Not found (required)
├── components/          # React components (Page.tsx, Menu.tsx, etc.)
├── assets/              # CSS, images, fonts
└── data/                # Seed data CSVs + post_install hook
```

**Theme seed data**: Themes can include a `data/` directory with CSV seed files and an `__init__.py` that defines `import_order` (list of CSVs to load) and optionally a `post_install(db)` function for custom setup logic beyond CSV imports (e.g., configuring site language defaults). Loaded at startup by `load_theme_seed_data()` in `setup_themes.py` for all themes.

**Build pipeline**: The backend's `setup_themes()` manages theme compilation — it syncs theme files to a data directory, runs `npm install` and `npm build`, and uses hash-based change detection to skip unnecessary rebuilds. Theme file edits are persisted to the DB (source of truth for edits) and also written to the filesystem for dev hot-reload.

**Theme registration**: Themes are auto-registered in `client/src/themes.ts` between comment markers. Each theme exports Astro components keyed by template name (e.g., `index`, `blog`, `single-blog`, `404`). Themes can also define custom pages beyond system templates.

**Theme component API**: Each `.astro` file receives a `data` prop (PageData, BlogListData, etc.). Interactive React components use `client:load` and consume data via `<WebsiteDataProvider>` + `useWebsiteData()` from `@deepsel/cms-react`.

### Client Request Flow

1. `[...slug].astro` catches all routes
2. `parseSlug()` extracts language code from URL path (e.g., `/en/about`)
3. `getPathType()` determines content type: Page, BlogList, BlogPost, SearchResults, or ClientPage
4. For client-only pages (theme defines custom component), skip backend fetch
5. For backend pages, fetch data via `@deepsel/cms-utils` functions
6. `getPageThemeComponent()` resolves the correct theme Astro component (with language-specific fallback)
7. Theme component renders full HTML document

### Admin API Pattern

The admin uses a `useModel(modelName, options)` hook that abstracts all backend API calls with pagination, sorting, search, AbortController cancellation, and optional URL sync. Auth tokens are stored via Capacitor Preferences (for mobile/hybrid support). The admin auto-fetches the OpenAPI schema on load for dynamic schema awareness.

### Packages

- **`@deepsel/cms-utils`** — Data fetching functions (`fetchPageData`, `fetchPublicSettings`, `fetchBlogList`, `fetchBlogPost`, `fetchSearchResults`), URL parsing (`parseSlug`, `getPathType`), TypeScript types (`PageData`, `SiteSettings`, etc.), hostname forwarding via `X-Original-Host` header
- **`@deepsel/cms-react`** — React components and hooks for theme authors: `WebsiteDataProvider`/`useWebsiteData()` context, `ContentRenderer` (renders TipTap HTML), `useAuthentication`, `useLanguage`, `PageTransition`

### Key Patterns

- **Multi-tenancy**: `organization_id` on models + user has multiple organizations
- **Multi-language**: Language prefix in URLs, language-specific theme file variants stored at `themes/{lang_code}/{theme_name}/`
- **Multi-domain**: Hostname forwarded via headers for domain-based routing
- **Preview mode**: `?preview=true` query param serves draft content (requires auth)
- **String IDs**: Models use `string_id` for referential integrity (`"table_name/string_id"` format)
