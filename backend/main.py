import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from constants import (
    APP_SECRET,
    DATABASE_URL,
    ONLY_MIGRATE,
    NO_MIGRATE,
    ENABLE_GRAPHQL,
    ENABLE_DOCS,
)
from deepsel.sqlalchemy import DatabaseManager
from apps.deepsel.utils.init_graphql import init_graphql
from apps.deepsel.utils.install_apps import install_routers, install_seed_data
from apps.deepsel.utils.models_pool import models_pool
from db import Base
from apps.deepsel.utils.server_events import on_startup, on_shutdown

# =============================================================================
# Logging
# =============================================================================

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(levelname)s:     [%(asctime)s] %(name)s %(message)s",
    datefmt="%d-%m-%Y %H:%M:%S",
)
logger = logging.getLogger(__name__)

# =============================================================================
# Lifecycle
# =============================================================================


@asynccontextmanager
async def lifespan(application: FastAPI):
    # --- Startup ---
    if not NO_MIGRATE:
        # DB migrations
        DatabaseManager(
            sqlalchemy_declarative_base=Base,
            db_url=DATABASE_URL,
            models_pool=models_pool,
        )

        # Import seed CSV data for each installed app
        install_seed_data()
        # Check app versions and run app upgrade tasks
        on_startup()

        # ONLY_MIGRATE — exit before server starts
        if ONLY_MIGRATE:
            logger.info("Migration completed successfully, exiting (ONLY_MIGRATE)")
            sys.exit(0)
    else:
        logger.info("Skipping database setup (NO_MIGRATE)")

    # Register routers for each installed app
    install_routers(application)

    # GraphQL (optional, disabled by default to save RAM)
    if ENABLE_GRAPHQL:
        init_graphql(application)

    yield

    # --- Shutdown ---
    on_shutdown()


# =============================================================================
# App
# =============================================================================

app = FastAPI(
    title="Deepsel Template API",
    description="© Deepsel Inc.",
    version="4.0",
    lifespan=lifespan,
    docs_url="/" if ENABLE_DOCS else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=APP_SECRET)


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc)
    raise exc
