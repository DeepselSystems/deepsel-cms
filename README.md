# Deepsel CMS

A full-stack content management system built with FastAPI, React, and Astro.

## Overview

Deepsel CMS is a monorepo containing all layers of a modern CMS:

| Package | Description |
|---------|-------------|
| `backend/` | FastAPI REST API + GraphQL, PostgreSQL |
| `admin/` | React 18 admin dashboard (Mantine UI, Tiptap editor) |
| `client/` | Astro 5 server-rendered public website |
| `themes/` | Astro-based themes (e.g. `interlinked`) |
| `packages/cms-react` | Shared React components (`@deepsel/cms-react`) |
| `packages/cms-utils` | Shared utilities (`@deepsel/cms-utils`) |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (for PostgreSQL)

### Backend

```bash
cd backend
cp .env.sample .env
docker-compose -f local.docker-compose.yml up -d   # start PostgreSQL
make install-dev
npm install   # for JSX compilation via esbuild
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

### Admin Dashboard

```bash
cd admin
npm install
npm run dev   # http://localhost:5173
```

### Public Website

```bash
cd client
npm install
npm run dev   # http://localhost:4322
```

The client proxies `/api/v1` to `http://localhost:8000`.

## Development

### Backend commands (run from `backend/`)

```bash
make install-dev    # Install with dev dependencies
make test           # Run pytest with coverage
make lint           # flake8 linting
make security       # bandit security scan
make format         # black formatting
make prepush        # lint + security + format-check + test
make reset_db       # reset database
```

### Frontend commands

```bash
# Admin (from admin/)
npm run dev
npm run build
npm run lint
npm run format

# Client (from client/)
npm run dev
npm run build
npm run format

# Monorepo root
npm run build       # builds client
npm run format      # format all workspaces
npm run prepush     # pre-push checks for packages
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License — see [LICENSE](LICENSE) for details.
