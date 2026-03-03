# Deepsel CMS

A headless CMS platform built as a monorepo with a Python FastAPI backend, React admin panel, and Astro SSR frontend.

## Repository Structure

```
├── backend/          Python FastAPI API server (SQLAlchemy, PostgreSQL)
├── admin/            React admin panel (Vite, Mantine, Zustand)
├── client/           Astro 5 SSR frontend (theme system)
├── packages/
│   ├── cms-react/    Shared React hooks & components (@deepsel/cms-react)
│   └── cms-utils/    Shared utility functions (@deepsel/cms-utils)
└── themes/           Astro theme packages (e.g. interlinked)
```

npm workspaces manage the frontend packages. The client references shared packages via `file:` links.

## Prerequisites

- **Python** >= 3.12
- **Node.js** (LTS recommended)
- **PostgreSQL** 17+ (or use Docker)
- **Docker** (optional, for local Postgres)

## Getting Started

### 1. Clone and install frontend dependencies

From the repo root:

```bash
npm install
```

This installs dependencies for all workspaces (client, admin, packages, themes).

### 2. Set up the backend

```bash
cd backend

# Create environment file
cp .env.sample .env
```

Edit `.env` with your database credentials and settings:

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | PostgreSQL database name |
| `DB_PORT` | No | Database port (default: 5432) |
| `APP_SECRET` | Yes | Secret key for session middleware |
| `FRONTEND_URL` | Yes | Frontend URL for CORS/email links |
| `FILESYSTEM` | No | Storage backend: `local`, `s3`, or `azure` |

**Start PostgreSQL with Docker:**

```bash
docker-compose -f local.docker-compose.yml up -d deepsel-cms-db
```

**Install Python dependencies:**

```bash
pip install -e .          # production
pip install -e ".[dev]"   # with dev tools (pytest, black, flake8, bandit)
```

Or via Makefile:

```bash
make install              # production
make install-dev          # with dev tools
```

**Install Node dependencies** (required for server-side JSX template compilation):

```bash
npm install
```

**Run the backend:**

```bash
uvicorn main:app --reload
```

The API starts at `http://localhost:8000`. Swagger docs are available at the root URL. On first startup, database migrations run automatically and CSV seed data is imported.

### 3. Run the frontend

**Client** (Astro SSR) — from the repo root:

```bash
npm run dev
```

Runs on `http://localhost:4322`. API requests to `/api/v1` are proxied to `http://localhost:8000`.

**Admin panel** — in a separate terminal:

```bash
cd admin
npm run dev
```

Runs on `http://localhost:5173/admin/`.

### Summary

Run three processes in separate terminals:

| Process | Directory | Command | URL |
|---|---|---|---|
| PostgreSQL | `backend/` | `docker-compose -f local.docker-compose.yml up -d deepsel-cms-db` | `localhost:5432` |
| Backend | `backend/` | `uvicorn main:app --reload` | `localhost:8000` |
| Client | root | `npm run dev` | `localhost:4322` |
| Admin | `admin/` | `npm run dev` | `localhost:5173/admin/` |

## Theme System

Themes are Astro component packages in `themes/`. Each theme provides four page templates:

| File | Purpose |
|---|---|
| `index.astro` | Page template |
| `blog.astro` | Blog list template |
| `single-blog.astro` | Single blog post template |
| `404.astro` | Not found template |

Themes are registered in `client/src/themes.ts`, which maps theme names to their components. The file has auto-managed sections marked by `THEME_IMPORTS_START`/`THEME_MAP_START` comments.

**Adding a new theme:**

1. Create `themes/<name>/` with the four `.astro` files and a `package.json`
2. Register the imports and mapping in `client/src/themes.ts`
3. Run `npm install` at the repo root to resolve the workspace link
4. Assign the theme to a site via the admin panel

## Backend Development

### App structure

Apps live in `backend/apps/`. The `deepsel` app is the core framework; `cms` contains CMS-specific logic.

```
apps/<app_name>/
├── models/       SQLAlchemy models (auto-discovered)
├── routers/      FastAPI routers (auto-installed)
├── data/         CSV seed data files
├── templates/    Email/text templates
└── utils/        Business logic
```

- The `models/` folder must be named exactly `models` for auto-discovery.
- The `routers/` folder must be named exactly `routers`. Each router file must define a variable named `router`.
- CSV files in `data/` must be named after their target table. Import order is defined in `data/__init__.py`.

### Naming conventions

- **Table names**: `snake_case`, singular (`order_item`, not `order_items`)
- **Model classes**: `CamelCaseModel` (`OrderItemModel`)
- **Router/model files**: Match the table name (`routers/order_item.py`, `models/order_item.py`)

### Creating a model

```python
from sqlalchemy import Column, Integer, String, Float
from db import Base
from deepsel.mixins.base_model import BaseModel

class ProductModel(Base, BaseModel):
    __tablename__ = "product"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Float)
```

`BaseModel` adds `created_at`, `updated_at`, `string_id`, `system`, `owner_id`, `organization_id`, and permission-checked CRUD methods (`create`, `get_one`, `get_all`, `search`, `update`, `delete`, `bulk_delete`).

### Creating a router

```python
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends

table_name = "product"
CRUDSchemas = generate_CRUD_schemas(table_name)

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)
```

This auto-generates REST endpoints: `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `DELETE /bulk`.

Pydantic schemas are auto-generated from model definitions. Relationships are expanded recursively in read schemas. Create/update schemas exclude `id`, relationships, and `BaseModel` fields.

### CSV data seeding

- Files must be `.csv` in `apps/<app>/data/`, named after the table
- `string_id` column is required — prevents duplicate inserts on restart
- Foreign key references use format `{related_table}/{column}` (e.g., `category/category_id`)
- File content references use format `file:{column_name}`
- JSON values use format `json:{column_name}`
- Default `owner_id` is `super_user`; default `organization_id` is `DEFAULT_ORG_ID`

### Migration control (Kubernetes)

| Env Variable | Behavior |
|---|---|
| `ONLY_MIGRATE` | Run migrations + seed data + startup logic, then exit |
| `NO_MIGRATE` | Skip migrations, start server normally |
| Neither | Normal startup with migrations |

## Code Quality

### Frontend

```bash
# Format all workspaces
npm run format

# Check formatting
npm run format:check

# Lint admin
cd admin && npm run lint

# Test packages
cd packages/cms-react && npm run test
cd packages/cms-utils && npm run test

# Pre-push checks for packages
npm run prepush
```

### Backend

```bash
cd backend

make format         # black auto-format
make lint           # flake8
make security       # bandit security scan
make test           # pytest with coverage (requires database)
make prepush        # all checks: lint + security + format-check + test
```

### Style rules

- **Frontend**: Prettier — single quotes, semicolons, trailing commas, 100 char width
- **Backend**: black — 88 char line length, Python 3.12 target
