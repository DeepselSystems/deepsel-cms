"""Utility for getting valid language codes from the database."""

import logging
from db import get_db_context
from apps.deepsel.utils.models_pool import models_pool

logger = logging.getLogger(__name__)


def get_valid_language_codes():
    """
    Get valid language codes from the locale table in the database.
    Returns a set of ISO codes.
    """
    try:
        LocaleModel = models_pool.get("locale")

        if not LocaleModel:
            logger.info("LocaleModel not available yet")
            return set()

        with get_db_context() as db:
            locales = (
                db.query(LocaleModel).filter(LocaleModel.iso_code.isnot(None)).all()
            )

            return {locale.iso_code for locale in locales if locale.iso_code}
    except Exception as e:
        logger.info(f"Could not query locale table: {e}")
        # Return empty set if table doesn't exist yet
        return set()
