import logging
import asyncio
from deepsel.utils.models_pool import models_pool
from deepsel.utils.migration_utils import migration_task
from deepsel.utils import encrypt, decrypt
from .models.organization import CMSSettingsModel
from apps.locales.models.locale import LocaleModel
from db import get_db_context

logger = logging.getLogger(__name__)


async def demo_running_background_task(db):
    logger.info("Demo running background task when upgrade app.")


async def run_cron_fetch_openrouter_model(db):
    OpenRouterModelModel = models_pool["openrouter_model"]
    OpenRouterModelModel().cron_fetch_openrouter_model(db)
    logger.info("Fetch openrouter models successfully.")


async def set_default_locale_if_empty(db):
    """Set default locale to en_US if not already set"""
    logger.info("Checking and setting default locale if needed")
    try:
        # Get all organizations that don't have a default language set
        orgs_without_default = (
            db.query(CMSSettingsModel)
            .filter(CMSSettingsModel.default_language_id == None)
            .all()
        )

        if orgs_without_default:
            # Find the en_US locale
            en_us_locale = (
                db.query(LocaleModel).filter(LocaleModel.string_id == "en_US").first()
            )

            if not en_us_locale:
                logger.warning("en_US locale not found in the database")
                return

            logger.info(f"Found en_US locale with ID: {en_us_locale.id}")

            # Update all organizations without a default language
            for org in orgs_without_default:
                logger.info(f"Setting default locale for organization ID: {org.id}")
                org.default_language_id = en_us_locale.id

                # If available_languages is empty, add en_US to it
                if not org.available_languages:
                    org.available_languages = [
                        {
                            "id": en_us_locale.id,
                            "name": "English / English",
                            "iso_code": "en",
                        }
                    ]
                elif en_us_locale.id not in org.available_languages:
                    org.available_languages.append(
                        {
                            "id": en_us_locale.id,
                            "name": "English / English",
                            "iso_code": "en",
                        }
                    )

                logger.info(org.available_languages)

            # Commit the changes
            db.commit()
            logger.info("Default locale set successfully")
    except Exception as e:
        logger.error(f"Error setting default locale: {e}")
        db.rollback()


@migration_task("Migration encrypts CMS API keys", "1.0.4")
def _migrate_cms_api_keys_to_encrypted_value(db, *args, **kwargs):
    """
    Encrypts CMS API keys that are stored as plain text in the database.
    This migration enhances security by encrypting sensitive API keys for CMS
    settings. Processes all organizations in the database.

    Encrypted API Keys:
        - OpenRouter API key (if not already encrypted)
    """
    # Create the logger
    internal_logger = logging.getLogger(
        f"{__name__}:{_migrate_cms_api_keys_to_encrypted_value.__name__}"
    )

    try:
        # Query all CMS settings organizations
        all_cms_settings = db.query(CMSSettingsModel).all()

        if not all_cms_settings:
            internal_logger.info("No CMS settings found. Skipping migration.")
            return

        internal_logger.info(f"Found {len(all_cms_settings)} CMS settings to process")

        # Process each organization
        for cms_settings in all_cms_settings:
            internal_logger.info(f"Processing organization ID: {cms_settings.id}")

            # Handle encrypting OpenRouter API key (if not already encrypted)
            # Check if the attribute exists and has data
            if (
                hasattr(cms_settings, "_openrouter_api_key")
                and cms_settings._openrouter_api_key
            ):
                try:
                    # Check if it's already encrypted by trying to decrypt it
                    try:
                        decrypt(cms_settings._openrouter_api_key)
                        internal_logger.info(
                            f"OpenRouter API key for org {cms_settings.id} is already encrypted"
                        )
                    except (ValueError, Exception):
                        # If decryption fails, it means it's plain text, so encrypt it
                        cms_settings._openrouter_api_key = encrypt(
                            cms_settings._openrouter_api_key
                        )
                        internal_logger.info(
                            f"Encrypted 'OpenRouter API key' for org {cms_settings.id} successfully"
                        )
                except Exception as e:
                    internal_logger.error(
                        f"Migration failed to encrypt 'OpenRouter API key' for org {cms_settings.id} - {e}"
                    )

        # Commit all changes
        db.commit()

        # Log the result
        internal_logger.info("CMS API keys migration completed successfully.")

    except Exception as e:
        internal_logger.error(f"CMS API keys migration failed with error: {e}")
        db.rollback()
        raise


async def set_default_domains(db):
    for org in db.query(CMSSettingsModel).all():
        if not org.domains:
            org.domains = ["*"]
            db.commit()


def upgrade(db, from_version, to_version):
    """Upgrade app from current version in db to version in file settings.py"""
    logger.info(f"Start upgrade from version {from_version} to {to_version}")

    # Encrypts cms api keys
    _migrate_cms_api_keys_to_encrypted_value(db, __name__, from_version, to_version)

    # Setup themes (now uses SQLAlchemy models instead of raw SQL)
    from .utils.setup_themes import setup_themes

    setup_themes()

    # Call background task if need start api server as sooon as possible
    asyncio.create_task(demo_running_background_task(db))

    # Set default locale if not already set
    asyncio.create_task(set_default_locale_if_empty(db))

    asyncio.create_task(run_cron_fetch_openrouter_model(db))

    asyncio.create_task(set_default_domains(db))
