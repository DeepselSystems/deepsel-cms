"""Enhanced FastAPI server with migration control capabilities.

This module provides a FastAPI server with environment variable support for controlling
database migration behavior, particularly useful for Kubernetes deployments.

Environment Variables:
- ONLY_MIGRATE: When set, runs migrations only and exits (for init containers)
- NO_MIGRATE: When set, skips migrations (for main containers)

If not set, the server runs normally with migrations on startup.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from constants import APP_SECRET
from deepsel.utils.install_apps import install_apps
from deepsel.utils.db_manager import startup_database_update
from deepsel.utils.server_events import on_startup, on_shutdown
from deepsel.utils.graphql_context import get_graphql_context
from strawberry.fastapi import GraphQLRouter
from contextlib import asynccontextmanager
import logging
import os
import sys
from starlette.middleware.sessions import SessionMiddleware
from traceback import format_exc


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(levelname)s:     [%(asctime)s] %(name)s %(message)s",
    datefmt="%d-%m-%Y %H:%M:%S",
)

# Initialize logger for this module
logger = logging.getLogger(__name__)


# =============================================================================
# MIGRATION CONFIGURATION FROM ENVIRONMENT VARIABLES
# =============================================================================

# Migration flags from environment variables
only_migrate = os.getenv("ONLY_MIGRATE", "").lower() in ("true", "1", "yes")
no_migrate = os.getenv("NO_MIGRATE", "").lower() in ("true", "1", "yes")

# Validate mutually exclusive options
if only_migrate and no_migrate:
    logger.error("Cannot use both ONLY_MIGRATE and NO_MIGRATE environment variables")
    sys.exit(1)

# Global flag to track if startup logic has been executed
_startup_logic_executed = False


def startup_logic():
    """Application startup logic."""
    global _startup_logic_executed

    if _startup_logic_executed:
        logger.info("Startup logic already executed, skipping...")
        return

    if no_migrate:
        logger.info("Skipping startup logic due to NO_MIGRATE env set")
        return

    if only_migrate:
        logger.info("Running startup logic for migration only")
    else:
        logger.info("Application startup logic executed")

    # Call the original on_startup function
    on_startup()
    _startup_logic_executed = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    try:
        logger.info("Starting application initialization")

        # Execute startup logic (will check internally if already executed)
        startup_logic()
        logger.info("Application startup completed")

        yield
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}", exc_info=True)
        raise
    finally:
        # Always run shutdown logic
        logger.info("Application shutdown initiated")
        on_shutdown()
        logger.info("Application shutdown completed")


app = FastAPI(
    title="Deepsel Template API",
    description="© Deepsel Inc.",
    version="3.0",
    lifespan=lifespan,
    docs_url="/",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=APP_SECRET)

# we want error raises to also be captured by the logger
# for log shipping purposes
err_logger = logging.getLogger("global_exception_handler")


@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    try:
        raise exc
    except Exception:
        err_logger.error(format_exc())
    raise exc


# Handle migration flags
if only_migrate:
    # Only run migrations and exit (proper order: database migration -> install apps -> startup logic)
    try:
        logger.info("Running database migrations only (ONLY_MIGRATE env set)")
        logger.info("Step 1/3: Running database migrations...")
        startup_database_update()
        logger.info("Step 2/3: Installing apps and importing data...")
        install_apps(app)
        logger.info("Step 3/3: Running startup logic...")
        startup_logic()
        logger.info("Migration process completed successfully, exiting...")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Failed during migration process: {e}", exc_info=True)
        sys.exit(1)

# Initialize database and install apps (skip if no-migrate)
try:
    if not no_migrate:
        logger.info("Initializing database and installing apps")
        startup_database_update()
        logger.info("Database migrations completed successfully")
    else:
        logger.info("Skipping database migrations due to NO_MIGRATE env set")

    install_apps(app)
    logger.info("Apps initialized successfully")

    # Initialize GraphQL
    logger.info("Initializing GraphQL schema generation")

    try:
        from deepsel.utils.graphql_schema import create_auto_schema

        graphql_schema = create_auto_schema()
        logger.info("GraphQL schema generation completed successfully")

    except Exception as e:
        logger.error(f"Failed to generate GraphQL schema: {e}")
        import traceback

        logger.error(f"Full traceback: {traceback.format_exc()}")

        # Create minimal fallback schema
        import strawberry

        @strawberry.type
        class Query:
            hello: str = strawberry.field(resolver=lambda: "Hello from GraphQL!")

        @strawberry.type
        class Mutation:
            pass

        graphql_schema = strawberry.Schema(query=Query, mutation=None)
        logger.info("Using minimal fallback GraphQL schema")

    # Create GraphQL router
    graphql_router = GraphQLRouter(
        schema=graphql_schema, context_getter=get_graphql_context
    )

    # Add GraphQL endpoint
    app.include_router(graphql_router, prefix="/graphql")
    logger.info("GraphQL endpoint initialized at /graphql")

except Exception as e:
    logger.error(f"Failed to initialize database, apps, or GraphQL: {e}", exc_info=True)
    raise
