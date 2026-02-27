# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deepsel CMS is a full-stack content management system organized as an npm monorepo. It consists of:
- **`backend/`** — FastAPI (Python 3.12) REST API + GraphQL, PostgreSQL
- **`admin/`** — React 18 + Vite admin dashboard (Mantine UI, Tiptap editor)
- **`client/`** — Astro 5 server-rendered public website
- **`themes/`** — Astro-based themes (e.g. `themes/starter_react/`)
- **`packages/`** — Shared npm packages (`@deepsel/cms-react`, `@deepsel/cms-utils`) published to npm

## Commands

### Backend (run from `backend/`)
```bash
make install-dev        # Install with dev dependencies
make test               # Run pytest with coverage
make lint               # flake8 linting
make security           # bandit security scan
make format             # black formatting
make format-check       # check formatting without changes
make prepush            # lint + security + format-check + test
make reset_db           # reset database via docker compose
uvicorn main:app --reload  # run dev server
```

Run a single test file:
```bash
pytest apps/deepsel/tests/test_crud_user.py
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

# Admin
cd admin && npm install && npm run dev

# Client
cd client && npm install && npm run dev
```

The client proxies `/api/v1` to `http://localhost:8000`.

Default login: username `admin`, password `1234`.

## After Making Edits

Run `make prepush` from `backend/` after any backend changes. This runs lint, security, format-check, and tests and must pass before committing.
