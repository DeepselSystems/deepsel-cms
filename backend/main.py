import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from settings import (
    APP_SECRET,
    API_PREFIX,
    DATABASE_URL,
    ONLY_MIGRATE,
    NO_MIGRATE,
    ENABLE_GRAPHQL,
    ENABLE_DOCS,
    DEFAULT_ORG_ID,
    installed_apps,
    version as src_version,
    SESSION_STORE_BACKEND,
    REDIS_URL,
    SESSION_DIR,
)
from deepsel.sqlalchemy import DatabaseManager
from deepsel.utils.install_apps import install_routers, install_seed_data
from deepsel.utils.server_events import on_startup, on_shutdown
from deepsel.utils import init_graphql
from deepsel.utils.api_router import set_api_prefix
from deepsel.utils.crud_router import configure_crud_router
from apps.core.utils.models_pool import models_pool
from apps.core.utils.get_current_user import get_current_user
from apps.core.models.organization import OrganizationModel
from db import Base, get_db, get_db_context

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

    # Initialize session store for cookie-based auth
    from deepsel.auth.session import create_session_store

    session_store = create_session_store(
        redis_url=REDIS_URL,
        db_session_factory=get_db_context,
        session_dir=SESSION_DIR,
        backend=SESSION_STORE_BACKEND,
    )
    application.state.session_store = session_store

    # Configure deepsel router utilities before importing routers
    set_api_prefix(API_PREFIX)
    configure_crud_router(db_func=get_db, get_current_user_func=get_current_user)

    # Register routers for each installed app
    install_routers(application, app_folders)

    # GraphQL (optional, disabled by default to save RAM)
    if ENABLE_GRAPHQL:
        from apps.core.utils.graphql_context import get_graphql_context

        init_graphql(application, context_getter=get_graphql_context)

    yield

    # --- Shutdown ---
    from apps.cms.utils.client_process import get_client_manager

    manager = get_client_manager()
    if manager:
        manager.shutdown()

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


@app.get(f"{API_PREFIX}/openapi.json", include_in_schema=False)
def get_openapi_schema():
    return app.openapi()


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc)
    raise exc
