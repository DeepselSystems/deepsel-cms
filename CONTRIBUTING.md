# Contributing to Deepsel CMS

Thank you for your interest in contributing to Deepsel CMS! This document provides guidelines and instructions for contributing to this monorepo.

## Repository Structure

- **`backend/`** — FastAPI (Python 3.12) REST API + GraphQL, PostgreSQL
- **`admin/`** — React 18 + Vite admin dashboard (Mantine UI, Tiptap editor)
- **`client/`** — Astro 5 server-rendered public website
- **`themes/`** — Astro-based themes
- **`packages/`** — Shared npm packages (`@deepsel/cms-react`, `@deepsel/cms-utils`)

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/DeepselSystems/deepsel-cms.git
   cd deepsel-cms
   ```

2. **Start the database**
   ```bash
   cd backend
   docker-compose -f local.docker-compose.yml up -d
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   cp .env.sample .env
   make install-dev
   npm install   # for JSX compilation via esbuild
   uvicorn main:app --reload
   ```

4. **Install frontend dependencies**
   ```bash
   cd admin && npm install && npm run dev   # port 5173
   cd client && npm install && npm run dev  # port 4322
   ```

5. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Backend (Python)

We use the following tools to maintain code quality:

- **Black** for code formatting (line length: 88)
- **Flake8** for linting
- **Bandit** for security checks
- **Pytest** for testing with coverage

Before committing backend changes, ensure all checks pass:

```bash
cd backend
make format      # Format code
make lint        # Run linting
make security    # Run security checks
make test        # Run tests
make prepush     # Run all of the above
```

Run a specific test file:
```bash
pytest apps/deepsel/tests/test_crud_user.py
```

### Frontend (JavaScript/TypeScript)

```bash
# Admin
cd admin
npm run lint       # ESLint
npm run lint:fix   # Auto-fix lint issues
npm run format     # Prettier formatting

# Client
cd client
npm run format     # Prettier formatting

# Packages
npm run prepush --workspace=packages/cms-react
npm run prepush --workspace=packages/cms-utils
```

### Commit Messages

Follow conventional commit format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Example:
```
feat: add rich text editor support for custom fields
```

## Pull Request Process

1. Ensure all tests pass (`make prepush` in `backend/`)
2. Update documentation if needed
3. Add tests for new functionality
4. Update `CHANGELOG.md` with your changes
5. Submit a PR with a clear description of the changes

## Code Review

- PRs require at least one approval
- Address all review comments
- Keep PRs focused and reasonably sized

## Questions?

Open an issue for questions or discussions about contributions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
