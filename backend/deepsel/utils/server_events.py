import logging
import signal
import importlib
from contextlib import contextmanager
from db import get_db_context
from deepsel.models.organization import OrganizationModel
from settings import installed_apps
from settings import version as src_version
from constants import DEFAULT_ORG_ID

logger = logging.getLogger(__name__)


def on_startup():
    logger.info(f"Server is starting...")
    try:
        # check and upgrade version if needed
        with get_db_context() as db:
            org = db.query(OrganizationModel).get(DEFAULT_ORG_ID)
            for app_name in installed_apps:
                try:
                    app_module = importlib.import_module(f"apps.{app_name}")
                    if hasattr(app_module, "upgrade"):
                        app_module.upgrade(db, org.current_version, src_version)
                except Exception as e:
                    logger.error(f"Error upgrading {app_name}: {e}")
            org.current_version = src_version
            db.commit()
    except Exception as e:
        logger.error(f"On startup failed: {e}")


def on_shutdown():
    print("Server has shutdown.")
