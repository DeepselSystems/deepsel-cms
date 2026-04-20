#!/usr/bin/env bash
# Deepsel CMS quickstart — get the full stack running on a fresh machine.
# Idempotent: safe to re-run.
#
# Usage:
#   ./scripts/quickstart.sh          # from inside a clone
#   curl -fsSL https://raw.githubusercontent.com/DeepselSystems/deepsel-cms/main/scripts/quickstart.sh | bash

set -euo pipefail

REPO_URL="https://github.com/DeepselSystems/deepsel-cms.git"
REPO_DIR_DEFAULT="deepsel-cms"
MIN_PYTHON="3.12"
MIN_NODE="22.22.1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

ok()    { printf "${GREEN}✓${NC} %s\n" "$1"; }
fail()  { printf "${RED}✗${NC} %s\n  ${YELLOW}→${NC} %s\n\n" "$1" "$2"; }
step()  { printf "\n${BOLD}${BLUE}==>${NC} ${BOLD}%s${NC}\n" "$1"; }
info()  { printf "    %s\n" "$1"; }

# ---------- version comparison ----------
# returns 0 if $1 >= $2 (semver-ish), 1 otherwise
version_ge() {
    [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# ---------- prereq checks ----------
MISSING=0

step "Checking prerequisites"

# Python 3.12+
if command -v python3.12 >/dev/null 2>&1; then
    PY_VER=$(python3.12 --version 2>&1 | awk '{print $2}')
    ok "Python $PY_VER"
    PYTHON_BIN="python3.12"
elif command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version 2>&1 | awk '{print $2}')
    if version_ge "$PY_VER" "$MIN_PYTHON"; then
        ok "Python $PY_VER"
        PYTHON_BIN="python3"
    else
        fail "Python $MIN_PYTHON+ not found (got: python3 $PY_VER)" \
             "Install: macOS \`brew install python@3.12\` | Ubuntu \`sudo apt install python3.12 python3.12-venv\`"
        MISSING=$((MISSING+1))
    fi
else
    fail "Python $MIN_PYTHON+ not found" \
         "Install: macOS \`brew install python@3.12\` | Ubuntu \`sudo apt install python3.12 python3.12-venv\`"
    MISSING=$((MISSING+1))
fi

# Node 24.11.0+
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node --version 2>&1 | sed 's/^v//')
    if version_ge "$NODE_VER" "$MIN_NODE"; then
        ok "Node $NODE_VER"
    else
        fail "Node $MIN_NODE+ required (got: $NODE_VER)" \
             "Install: see https://nodejs.org or \`nvm install 22 && nvm use 22\`"
        MISSING=$((MISSING+1))
    fi
else
    fail "Node $MIN_NODE+ not found" \
         "Install: see https://nodejs.org or \`nvm install 22 && nvm use 22\`"
    MISSING=$((MISSING+1))
fi

# npm
if command -v npm >/dev/null 2>&1; then
    ok "npm $(npm --version)"
else
    fail "npm not found" "Reinstall Node.js (npm ships with it)"
    MISSING=$((MISSING+1))
fi

# Docker
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
    else
        fail "Docker is installed but the daemon is not running" \
             "Start Docker Desktop (macOS) or \`sudo systemctl start docker\` (Linux), then re-run"
        MISSING=$((MISSING+1))
    fi
else
    fail "Docker not found" \
         "Install: macOS Docker Desktop https://docker.com | Ubuntu \`sudo apt install docker.io\`"
    MISSING=$((MISSING+1))
fi

# docker compose (plugin or legacy)
DOCKER_COMPOSE=""
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
    ok "$DOCKER_COMPOSE $(docker compose version --short 2>/dev/null || echo)"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
    ok "docker-compose $(docker-compose --version | awk '{print $4}' | tr -d ',')"
else
    fail "docker compose not found" \
         "Install: Docker Desktop bundles it | Ubuntu \`sudo apt install docker-compose-plugin\`"
    MISSING=$((MISSING+1))
fi

# git
if command -v git >/dev/null 2>&1; then
    ok "git $(git --version | awk '{print $3}')"
else
    fail "git not found" \
         "Install: macOS \`xcode-select --install\` | Ubuntu \`sudo apt install git\`"
    MISSING=$((MISSING+1))
fi

if [ "$MISSING" -gt 0 ]; then
    printf "\n${RED}${BOLD}%d prerequisite(s) missing.${NC} Fix the above and re-run.\n" "$MISSING"
    exit 1
fi

# ---------- repo bootstrap ----------
step "Locating repo"
if [ -f "package.json" ] && [ -d "backend" ] && [ -f ".env.sample" ]; then
    info "Already inside a deepsel-cms checkout: $(pwd)"
elif [ -d "$REPO_DIR_DEFAULT" ]; then
    info "Found existing $REPO_DIR_DEFAULT/ — entering"
    cd "$REPO_DIR_DEFAULT"
else
    info "Cloning $REPO_URL → ./$REPO_DIR_DEFAULT"
    git clone "$REPO_URL" "$REPO_DIR_DEFAULT"
    cd "$REPO_DIR_DEFAULT"
fi

# ---------- .env ----------
step "Configuring .env"
if [ -f ".env" ]; then
    info ".env already exists — leaving it alone"
else
    cp .env.sample .env
    ok "Created .env from .env.sample"
fi

# ---------- Postgres ----------
step "Starting PostgreSQL"
$DOCKER_COMPOSE -f backend/local.docker-compose.yml up -d
info "Waiting for Postgres on port 5432..."
for i in $(seq 1 30); do
    if (echo > /dev/tcp/127.0.0.1/5432) >/dev/null 2>&1; then
        ok "Postgres ready"
        break
    fi
    if [ "$i" = "30" ]; then
        printf "${RED}✗${NC} Postgres did not become ready in 30s\n"
        exit 1
    fi
    sleep 1
done

# ---------- Python venv + backend install ----------
step "Installing backend (Python venv + pip)"
if [ ! -d ".venv" ]; then
    info "Creating .venv with $PYTHON_BIN"
    $PYTHON_BIN -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate
info "Installing backend (pip install -e ./backend[dev])..."
pip install --quiet --upgrade pip
pip install -e './backend[dev]'
ok "Backend installed"

# ---------- Run ----------
step "Starting Deepsel CMS"
cat <<EOF

${BOLD}First boot will take a few minutes${NC} — the backend will:
  • run database migrations
  • load seed data (default user: ${BOLD}admin / 1234${NC})
  • sync, npm install, and build the Astro client (cached afterwards)

Once you see "Application startup complete":
  ${BOLD}Site:${NC}  http://localhost:4321
  ${BOLD}Admin:${NC} http://localhost:4321/admin
  ${BOLD}API:${NC}   http://localhost:8000

Press Ctrl+C to stop.

EOF

cd backend
exec uvicorn main:app
