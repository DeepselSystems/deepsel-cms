import logging
import asyncio
from sqlalchemy import text as sa_text
from apps.core.utils.models_pool import models_pool
from deepsel.utils import migration_task
from settings import APP_SECRET
from deepsel.utils.crypto import encrypt as _encrypt, decrypt as _decrypt
from .models.organization import CMSSettingsModel
from apps.core.models.locale import LocaleModel
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
                        _decrypt(cms_settings._openrouter_api_key, APP_SECRET)
                        internal_logger.info(
                            f"OpenRouter API key for org {cms_settings.id} is already encrypted"
                        )
                    except (ValueError, Exception):
                        # If decryption fails, it means it's plain text, so encrypt it
                        cms_settings._openrouter_api_key = _encrypt(
                            cms_settings._openrouter_api_key, APP_SECRET
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


async def set_default_ai_models(db):
    """Set default AI models on organizations if not already set."""
    logger.info("Checking and setting default AI models if needed")
    try:
        OpenRouterModelModel = models_pool["openrouter_model"]

        defaults = {
            "ai_translation_model_id": "google/gemini-2.0-flash-lite",
            "ai_default_writing_model_id": "google/gemini-2.5-pro",
            "ai_autocomplete_model_id": "google/gemini-2.0-flash-lite",
            "chatbox_model_id": "anthropic/claude-sonnet-4.6",
        }

        # Resolve string_ids to actual model IDs
        resolved = {}
        for field, string_id in defaults.items():
            model = (
                db.query(OpenRouterModelModel)
                .filter(OpenRouterModelModel.string_id == string_id)
                .first()
            )
            if model:
                resolved[field] = model.id
            else:
                logger.warning(f"OpenRouter model '{string_id}' not found, skipping {field}")

        if not resolved:
            return

        for org in db.query(CMSSettingsModel).all():
            updated = False
            for field, model_id in resolved.items():
                if not getattr(org, field, None):
                    setattr(org, field, model_id)
                    updated = True
            if updated:
                logger.info(f"Set default AI models for organization {org.id}")

        db.commit()
    except Exception as e:
        logger.error(f"Error setting default AI models: {e}")
        db.rollback()


async def set_default_domains(db):
    for org in db.query(CMSSettingsModel).all():
        if not org.domains:
            org.domains = ["*"]
            db.commit()


def set_default_theme_if_empty(db):
    """Set default theme to starter_react if not already set, and load its seed data."""
    logger.info("Checking and setting default theme if needed")
    try:
        orgs_without_theme = (
            db.query(CMSSettingsModel)
            .filter(CMSSettingsModel.selected_theme == None)  # noqa: E711
            .all()
        )

        if orgs_without_theme:
            for org in orgs_without_theme:
                logger.info(f"Setting default theme for organization ID: {org.id}")
                org.selected_theme = "starter_react"

            db.commit()

            from .utils.setup_themes import load_seed_data_for_theme

            load_seed_data_for_theme("starter_react", db)
            logger.info("Default theme set successfully")
    except Exception as e:
        logger.error(f"Error setting default theme: {e}")
        db.rollback()


@migration_task("Add full-text search vectors to content tables", "1.0.6")
def _migrate_add_search_vectors(db, *args, **kwargs):
    """Enable pg_trgm and backfill search_vector columns for FTS."""
    _logger = logging.getLogger(f"{__name__}:{_migrate_add_search_vectors.__name__}")

    try:
        db.execute(sa_text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))

        # Backfill page_content search vectors
        db.execute(sa_text("""
                UPDATE page_content
                SET search_vector =
                    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('simple', coalesce(
                        regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g'),
                    '')), 'B')
            """))

        # Backfill blog_post_content search vectors
        db.execute(sa_text("""
                UPDATE blog_post_content
                SET search_vector =
                    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('simple', coalesce(
                        regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g'),
                    '')), 'B')
            """))

        db.commit()
        _logger.info("Search vectors backfilled successfully.")
    except Exception as e:
        _logger.error(f"Failed to backfill search vectors: {e}")
        db.rollback()
        raise


def upgrade(db, from_version, to_version):
    """Upgrade app from current version in db to version in file settings.py"""
    logger.info(f"Start upgrade from version {from_version} to {to_version}")

    # Encrypts cms api keys
    _migrate_cms_api_keys_to_encrypted_value(db, __name__, from_version, to_version)

    # Full-text search vectors
    _migrate_add_search_vectors(db, __name__, from_version, to_version)

    # Setup themes (now uses SQLAlchemy models instead of raw SQL)
    from .utils.setup_themes import setup_themes

    setup_themes()

    # Set default theme synchronously before starting client,
    # so seed data + post_install run on fresh DB
    set_default_theme_if_empty(db)

    # Start the Astro client after themes are built
    from .utils.client_process import get_client_manager

    manager = get_client_manager()
    if manager:
        manager.start()

    # Call background task if need start api server as sooon as possible
    asyncio.create_task(demo_running_background_task(db))

    # Set default locale if not already set
    asyncio.create_task(set_default_locale_if_empty(db))

    asyncio.create_task(run_cron_fetch_openrouter_model(db))

    asyncio.create_task(set_default_domains(db))

    asyncio.create_task(set_default_ai_models(db))
