import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from settings import (
    APP_SECRET,
    DATABASE_URL,
    ONLY_MIGRATE,
    NO_MIGRATE,
    ENABLE_GRAPHQL,
    ENABLE_DOCS,
    DEFAULT_ORG_ID,
    installed_apps,
    version as src_version,
)
from deepsel.sqlalchemy import DatabaseManager
from deepsel.utils.install_apps import install_routers, install_seed_data
from deepsel.utils.server_events import on_startup, on_shutdown
from apps.core.utils.init_graphql import init_graphql
from apps.core.utils.models_pool import models_pool
from apps.core.models.organization import OrganizationModel
from db import Base, get_db_context

app_folders = [f"apps/{app_name}" for app_name in installed_apps]

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
        with get_db_context() as db:
            install_seed_data(app_folders, db)
        # Check app versions and run app upgrade tasks
        with get_db_context() as db:
            org = db.query(OrganizationModel).get(DEFAULT_ORG_ID)
            on_startup(
                db=db,
                app_names=installed_apps,
                src_version=src_version,
                current_version=org.current_version,
                set_version=lambda db, v: setattr(org, "current_version", v),
            )

        # ONLY_MIGRATE — exit before server starts
        if ONLY_MIGRATE:
            logger.info("Migration completed successfully, exiting (ONLY_MIGRATE)")
            sys.exit(0)
    else:
        logger.info("Skipping database setup (NO_MIGRATE)")

    # Register routers for each installed app
    install_routers(application, app_folders)

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
