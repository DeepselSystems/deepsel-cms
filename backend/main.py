"""FastAPI server with migration control and optional GraphQL.

Environment Variables:
- ONLY_MIGRATE: Run migrations only and exit (for K8s init containers)
- NO_MIGRATE: Skip migrations (for main containers)
- ENABLE_GRAPHQL: Enable GraphQL endpoint at /graphql (default: false)
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from traceback import format_exc

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from constants import APP_SECRET, DATABASE_URL, ONLY_MIGRATE, NO_MIGRATE, ENABLE_GRAPHQL
from deepsel.sqlalchemy import DatabaseManager
from apps.deepsel.utils.install_apps import install_apps
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
err_logger = logging.getLogger("global_exception_handler")

if ONLY_MIGRATE and NO_MIGRATE:
    logger.error("Cannot use both ONLY_MIGRATE and NO_MIGRATE")
    sys.exit(1)

# =============================================================================
# Startup logic
# =============================================================================

_startup_logic_executed = False


def startup_logic():
    """Run on_startup() once, respecting migration flags."""
    global _startup_logic_executed

    if _startup_logic_executed:
        return

    if NO_MIGRATE:
        logger.info("Skipping startup logic (NO_MIGRATE)")
        return

    if ONLY_MIGRATE:
        logger.info("Running startup logic for migration only")
    else:
        logger.info("Running startup logic")

    on_startup()
    _startup_logic_executed = True


# =============================================================================
# Lifespan
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    try:
        startup_logic()
        logger.info("Application startup completed")
        yield
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}", exc_info=True)
        raise
    finally:
        logger.info("Application shutdown initiated")
        on_shutdown()
        logger.info("Application shutdown completed")


# =============================================================================
# App factory
# =============================================================================


def create_app() -> FastAPI:
    application = FastAPI(
        title="Deepsel Template API",
        description="© Deepsel Inc.",
        version="4.0",
        lifespan=lifespan,
        docs_url="/",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(SessionMiddleware, secret_key=APP_SECRET)

    @application.exception_handler(Exception)
    def global_exception_handler(request: Request, exc: Exception):
        try:
            raise exc
        except Exception:
            err_logger.error(format_exc())
        raise exc

    return application


# =============================================================================
# GraphQL (conditional)
# =============================================================================


def init_graphql(application: FastAPI):
    """Generate GraphQL schema and mount at /graphql."""
    from apps.deepsel.utils.graphql_context import get_graphql_context

    logger.info("Initializing GraphQL schema")

    try:
        from apps.deepsel.utils.graphql_schema import create_auto_schema

        graphql_schema = create_auto_schema()
        logger.info("GraphQL schema generated successfully")
    except Exception as e:
        logger.error(f"Failed to generate GraphQL schema: {e}", exc_info=True)

        import strawberry

        @strawberry.type
        class Query:
            hello: str = strawberry.field(resolver=lambda: "Hello from GraphQL!")

        graphql_schema = strawberry.Schema(query=Query)
        logger.info("Using minimal fallback GraphQL schema")

    from strawberry.fastapi import GraphQLRouter

    graphql_router = GraphQLRouter(
        schema=graphql_schema, context_getter=get_graphql_context
    )
    application.include_router(graphql_router, prefix="/graphql", tags=["GraphQL"])
    logger.info("GraphQL endpoint initialized at /graphql")


# =============================================================================
# Bootstrap
# =============================================================================

app = create_app()

# Migration-only mode: migrate, install apps, run startup, then exit
# For use cases such as k8s initContainers
if ONLY_MIGRATE:
    try:
        logger.info("ONLY_MIGRATE mode: running migrations and exiting")
        DatabaseManager(
            sqlalchemy_declarative_base=Base,
            db_url=DATABASE_URL,
            models_pool=models_pool,
        )
        install_apps(app)
        startup_logic()
        logger.info("Migration completed successfully, exiting")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)

# Normal startup
try:
    if not NO_MIGRATE:
        DatabaseManager(
            sqlalchemy_declarative_base=Base,
            db_url=DATABASE_URL,
            models_pool=models_pool,
        )
    else:
        logger.info("Skipping database migrations (NO_MIGRATE)")

    install_apps(app)
    logger.info("Apps initialized successfully")

    if ENABLE_GRAPHQL:
        init_graphql(app)
    else:
        logger.info("GraphQL disabled (set ENABLE_GRAPHQL=true to enable)")

except Exception as e:
    logger.error(f"Failed to initialize application: {e}", exc_info=True)
    raise
