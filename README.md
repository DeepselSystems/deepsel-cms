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
| `mcp/` | MCP server — exposes CMS operations to AI clients |

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

### Default Login

- **Username:** `admin`
- **Password:** `1234`

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

## MCP Server

The `mcp/` package exposes Deepsel CMS as an [MCP](https://modelcontextprotocol.io) server, letting AI clients (Claude Desktop, Claude Code, Cursor, etc.) manage your CMS content directly.

### Tools available

| Category | Tools |
|----------|-------|
| Pages | `list_pages`, `get_page`, `create_page`, `update_page`, `delete_page`, `list_page_contents`, `get_page_content`, `create_page_content`, `update_page_content`, `delete_page_content`, `generate_slug`, `validate_slug` |
| Blog posts | `list_blog_posts`, `get_blog_post`, `create_blog_post`, `update_blog_post`, `delete_blog_post`, `list_blog_post_contents`, `get_blog_post_content`, `create_blog_post_content`, `update_blog_post_content`, `delete_blog_post_content` |
| Menus | `list_menus`, `get_menu`, `create_menu`, `update_menu`, `delete_menu` |
| Templates | `list_templates`, `get_template`, `create_template`, `update_template`, `delete_template`, `list_template_contents`, `get_template_content`, `create_template_content`, `update_template_content` |
| Attachments | `list_attachments`, `get_attachment`, `delete_attachment`, `get_attachment_url` |
| Themes | `list_themes`, `select_theme`, `list_theme_files`, `get_theme_file`, `save_theme_file` |
| Revisions | `list_revisions`, `get_revision`, `restore_revision` |
| AI | `translate_page_content`, `translate_blog_post_content`, `generate_page_content`, `list_ai_models` |
| Settings | `get_cms_settings`, `update_cms_settings` |
| Locales | `list_locales` |
| Activity | `list_activities`, `get_activity` |

### Setup

The MCP server is a local process that makes HTTP calls to your CMS backend (local or remote). You only need [`uv`](https://docs.astral.sh/uv/) installed.

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "deepsel-cms": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/deepsel-cms/mcp", "deepsel-cms-mcp"],
      "env": {
        "MCP_CMS_BASE_URL": "https://your-cms.example.com",
        "MCP_CMS_USERNAME": "admin",
        "MCP_CMS_PASSWORD": "your-password"
      }
    }
  }
}
```

**Claude Code** — edit `~/.claude/settings.json` (global) or `.claude/settings.json` (project):

```json
{
  "mcpServers": {
    "deepsel-cms": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/deepsel-cms/mcp", "deepsel-cms-mcp"],
      "env": {
        "MCP_CMS_BASE_URL": "https://your-cms.example.com",
        "MCP_CMS_USERNAME": "admin",
        "MCP_CMS_PASSWORD": "1234"
      }
    }
  }
}
```

Replace `/path/to/deepsel-cms` with the absolute path to your cloned repo. For a local backend use `http://localhost:8000` as `MCP_CMS_BASE_URL`.

You can run multiple named instances to target different environments simultaneously (e.g. `deepsel-cms-prod` and `deepsel-cms-staging`).

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License — see [LICENSE](LICENSE) for details.
