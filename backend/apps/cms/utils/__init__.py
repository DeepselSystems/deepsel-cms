import logging
import asyncio
from apps.deepsel.utils.models_pool import models_pool
from traceback import format_exc

logger = logging.getLogger(__name__)


async def demo_running_background_task(db):
    logger.info("Demo running background task when upgrade app.")


async def set_default_locale_if_empty(db):
    """Set default locale to en_US if not already set"""
    logger.info("Checking and setting default locale if needed")
    try:
        OrganizationModel = models_pool["organization"]
        # Get all organizations that don't have a default language set
        orgs_without_default = (
            db.query(OrganizationModel)
            .filter(OrganizationModel.default_language_id == None)
            .all()
        )

        if orgs_without_default:
            LocaleModel = models_pool["locale"]
            # Find the en locale
            en_locale = (
                db.query(LocaleModel).filter(LocaleModel.iso_code == "en").first()
            )

            if not en_locale:
                logger.warning("en locale not found in the database")
                return

            # Update all organizations without a default language
            for org in orgs_without_default:
                logger.info(f"Setting default locale for organization ID: {org.id}")
                org.default_language_id = en_locale.id

                # If available_languages is empty, add en to it
                if not org.available_languages:
                    org.available_languages = [
                        {
                            "id": en_locale.id,
                            "name": en_locale.name,
                            "iso_code": en_locale.iso_code,
                            "emoji_flag": en_locale.emoji_flag,
                        }
                    ]
                elif en_locale.id not in org.available_languages:
                    org.available_languages.append(
                        {
                            "id": en_locale.id,
                            "name": en_locale.name,
                            "iso_code": en_locale.iso_code,
                            "emoji_flag": en_locale.emoji_flag,
                        }
                    )

            # Commit the changes
            db.commit()
            logger.info("Default locale set successfully")
    except Exception:
        logger.error(f"Error setting default locale: \n{format_exc()}")
        db.rollback()


def upgrade(db, from_version, to_version):
    """Upgrade app from current version in db to version in file settings.py"""
    logger.info(f"Start upgrade from version {from_version} to {to_version}")

    # Call background task if need start api server as sooon as possible
    asyncio.create_task(demo_running_background_task(db))

    # Set default locale if not already set
    asyncio.create_task(set_default_locale_if_empty(db))
