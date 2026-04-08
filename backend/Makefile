.PHONY: help install install-dev clean test lint format format-check build security prepush reset_db version tree bump-major bump-minor bump-patch run db

help:
	@echo "Deepsel CMS - Makefile Commands"
	@echo "================================="
	@echo ""
	@echo "Development:"
	@echo "  make install          - Install backend package in production mode"
	@echo "  make install-dev      - Install backend package with dev dependencies"
	@echo "  make clean            - Remove build artifacts and cache files"
	@echo "  make reset_db         - Reset database (docker compose)"
	@echo ""
	@echo "Code Quality:"
	@echo "  make test             - Run tests with coverage"
	@echo "  make lint             - Run linting checks (flake8)"
	@echo "  make security         - Run security checks (bandit)"
	@echo "  make format           - Format code with black"
	@echo "  make format-check     - Check code formatting without changes"
	@echo ""
	@echo "Utilities:"
	@echo "  make version          - Show current package version"
	@echo "  make bump-major       - Bump major version (X.0.0)"
	@echo "  make bump-minor       - Bump minor version (0.X.0)"
	@echo "  make bump-patch       - Bump patch version (0.0.X)"
	@echo "  make tree             - Show project structure"
	@echo "  make prepush          - Run all pre-push checks"
	@echo "  make run              - Start dev server (uvicorn)"
	@echo "  make db               - Start PostgreSQL container"
	@echo "  make reset_db         - Reset database via docker compose"

install:
	pip install -e .

install-dev:
	pip install -e ".[dev]"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info
	rm -rf .eggs/
	find -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find -type f -name "*.pyc" -delete
	find -type f -name "*.pyo" -delete
	find -type f -name "*.egg" -delete
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf .mypy_cache/
	@echo "Clean complete!"

test:
	@echo "Running tests with coverage..."
	pytest --cov=. --cov-report=term-missing --cov-report=xml

lint:
	@echo "Running flake8..."
	flake8 apps --ignore=E501,F401,W292,E261,W503,W504,E302,F541,E303,E712,E711,E203,W291

security:
	@echo "Running bandit security checks..."
	bandit -r apps -f screen --skip B311

format:
	@echo "Formatting code with black..."
	black .

format-check:
	@echo "Checking code formatting..."
	black . --check --verbose --diff --color

build: clean
	@echo "Building distribution packages..."
	python -m build
	@echo "Build complete! Packages are in dist/"

check-dist: build
	@echo "Checking distribution package..."
	twine check dist/*

publish: check-dist
	@echo "Publishing to PyPI..."
	@echo "WARNING: This will upload to production PyPI!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		twine upload dist/*; \
	fi

prepush:
	@echo "Running prepush checks..."
	make lint
	make security
	make test

tree:
	@echo "Project structure:"
	@tree -I '__pycache__|*.pyc|*.egg-info|build|dist|.git|node_modules' -L 3 || \
	find . -not -path '*/\.*' -not -path '*/build/*' -not -path '*/dist/*' \
		-not -path '*/__pycache__/*' -not -path '*.egg-info/*' -not -path '*/node_modules/*' | \
		grep -v '\.pyc$$' | sort

version:
	@grep '^version = ' pyproject.toml | sed 's/version = "\(.*\)"/\1/'

bump-major:
	@echo "Bumping major version..."
	@current=$$(grep '^version = ' pyproject.toml | sed 's/version = "\(.*\)"/\1/'); \
	major=$$(echo $$current | cut -d. -f1); \
	new_version=$$((major + 1)).0.0; \
	sed -i '' "s/^version = \".*\"/version = \"$$new_version\"/" pyproject.toml; \
	echo "Version bumped from $$current to $$new_version"

bump-minor:
	@echo "Bumping minor version..."
	@current=$$(grep '^version = ' pyproject.toml | sed 's/version = "\(.*\)"/\1/'); \
	major=$$(echo $$current | cut -d. -f1); \
	minor=$$(echo $$current | cut -d. -f2); \
	new_version=$$major.$$((minor + 1)).0; \
	sed -i '' "s/^version = \".*\"/version = \"$$new_version\"/" pyproject.toml; \
	echo "Version bumped from $$current to $$new_version"

bump-patch:
	@echo "Bumping patch version..."
	@current=$$(grep '^version = ' pyproject.toml | sed 's/version = "\(.*\)"/\1/'); \
	major=$$(echo $$current | cut -d. -f1); \
	minor=$$(echo $$current | cut -d. -f2); \
	patch=$$(echo $$current | cut -d. -f3); \
	new_version=$$major.$$minor.$$((patch + 1)); \
	sed -i '' "s/^version = \".*\"/version = \"$$new_version\"/" pyproject.toml; \
	echo "Version bumped from $$current to $$new_version"

run:
	uvicorn main:app --reload --timeout-graceful-shutdown 3

db:
	docker-compose -f local.docker-compose.yml up -d

reset_db:
	docker-compose -f local.docker-compose.yml down -v
	docker-compose -f local.docker-compose.yml up -d

# Quick shortcuts
t: test
l: lint
s: security
f: format
c: clean
p: prepush
r: run
