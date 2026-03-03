# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deepsel CMS — a headless CMS platform with a monorepo structure containing a Python FastAPI backend, a React admin panel, an Astro SSR frontend, and shared npm packages.

## Monorepo Layout

- **`backend/`** — Python FastAPI API server (SQLAlchemy ORM, PostgreSQL)
- **`admin/`** — React admin panel (Vite, Mantine UI, Zustand, React Router)
- **`client/`** — Astro 5 SSR frontend (file-based routing, theme system)
- **`packages/cms-react/`** — Shared React hooks/components (TypeScript, published as `@deepsel/cms-react`)
- **`packages/cms-utils/`** — Shared utility functions (TypeScript, published as `@deepsel/cms-utils`)
- **`themes/`** — Astro theme component packages

npm workspaces are configured at the root. The client consumes `@deepsel/cms-react` and `@deepsel/cms-utils` via `file:` links.

## Common Commands

### Root (monorepo)

```bash
npm run dev              # Dev client (Astro on :4322)
npm run build            # Build client
npm run format           # Prettier across all workspaces
npm run format:check     # Check formatting
npm run prepush          # Run prepush checks for packages
```

### Admin (`admin/`)

```bash
npm run dev              # Vite dev server on :5173 (--host)
npm run build            # Production build
npm run lint             # ESLint
npm run lint:fix         # ESLint autofix
npm run format           # Prettier
```

### Client (`client/`)

```bash
npm run dev              # Astro dev on :4322 (--host 0.0.0.0)
npm run build            # Astro build
npm run format           # Prettier
```

### Packages (`packages/cms-react/`, `packages/cms-utils/`)

```bash
npm run build            # tsc compile
npm run dev              # tsc --watch
npm run test             # vitest run
npm run test:watch       # vitest watch mode
npm run lint             # ESLint
npm run prepush          # test + build + lint + format:check
```

### Backend (`backend/`)

```bash
uvicorn main:app --reload          # Run dev server
make test                          # pytest with coverage
make lint                          # flake8
make security                      # bandit security scan
make format                        # black formatter
make prepush                       # lint + security + format-check + test
make reset_db                      # Reset database via docker compose
docker-compose -f local.docker-compose.yml up -d deepsel-cms-db  # Start local Postgres
```

Backend requires Python 3.12+ and PostgreSQL. Install via `pip install -e .` (or `pip install -e ".[dev]"` for dev tools). Equivalent Makefile targets: `make install` / `make install-dev`. JSX template compilation needs `npm install` inside `backend/`.

## Architecture

### Backend (FastAPI + SQLAlchemy)

- Apps live in `backend/apps/`. The `deepsel` app is the core framework (base models, CRUD mixins, permissions). The `cms` app contains CMS-specific models/routers.
- **Auto-router**: Any file in `apps/*/routers/` with a `router` variable is auto-installed. Folder must be named `routers`.
- **Auto-models**: Any model in `apps/*/models/` is auto-discovered. Folder must be named `models`.
- **CRUDRouter**: Generates standard REST endpoints (list, create, get, update, delete, bulk_delete) from Pydantic schemas auto-generated from SQLAlchemy models.
- **BaseModel mixin** (`deepsel/mixins/base_model.py`): Adds `created_at`, `updated_at`, `string_id`, `system`, `owner_id`, `organization_id` and permission-checked CRUD methods.
- **Multi-tenant isolation**: All records scoped by `organization_id` and `owner_id`.
- **CSV seeding**: `apps/*/data/*.csv` files seed the database on startup. File names must match table names. `string_id` column prevents duplicate inserts.
- API prefix: `/api/v1/`

### Naming conventions (backend)

- Table names: `snake_case`, singular (e.g., `order_item`)
- Model classes: `CamelCaseModel` (e.g., `OrderItemModel`)
- Router files: same name as table (e.g., `routers/order_item.py`)
- Router variable must be named `router`

### Admin Panel (React + Vite)

- State management: **Zustand** stores in `admin/src/common/stores/`
- API interaction: `useModel` hook (`admin/src/common/api/useModel.jsx`) for CRUD operations, `useFetch` for raw requests
- UI framework: **Mantine** components + **MUI DataGrid** for tables
- Rich text: **Tiptap** editor with custom media extensions
- Routing: React Router with `basename="/admin"`, protected by `<RequireAuth>`
- i18n: i18next with browser language detection
- Reusable UI components in `admin/src/common/ui/`

### Client (Astro SSR)

- Catch-all route `client/src/pages/[...slug].astro` handles all pages
- URL slug parsed via `parseSlug()` → determines `pathType` (Page, BlogList, BlogPost)
- Theme system: `client/src/themes.ts` maps theme names to component sets (index, blog list, single blog, 404)
- Language resolved from URL prefix (e.g., `/fr/about`)
- Dev proxy: `/api/v1` requests forwarded to `http://localhost:8000`

### Shared Packages

- `@deepsel/cms-utils`: Pure utility functions — `fetchPageData`, `fetchBlogList`, `fetchBlogPost`, `parseSlug`, `isValidLanguageCode`, `getAuthToken`
- `@deepsel/cms-react`: React-specific — `ContentRenderer`, `PageTransition`, `WebsiteDataContext`, `useAuthentication`, `useLanguage`

## Code Quality

- **Frontend formatting**: Prettier (singleQuote, semi, trailingComma: all, printWidth: 100)
- **Backend formatting**: black (line length 88)
- **Backend linting**: flake8 + bandit
- **Frontend linting**: ESLint (admin uses eslint-plugin-react/react-hooks/unused-imports)
- **Package tests**: Vitest with happy-dom (cms-react) or node (cms-utils) environments
- **Backend tests**: pytest (requires running database)
