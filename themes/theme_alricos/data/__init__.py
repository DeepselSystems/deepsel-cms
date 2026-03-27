import logging

logger = logging.getLogger(__name__)

import_order = [
    "menu.csv",
]


def post_install(db):
    """Add German to available languages and set as default site language."""
    from apps.core.models.locale import LocaleModel
    from apps.cms.models.organization import CMSSettingsModel

    de_locale = db.query(LocaleModel).filter(LocaleModel.string_id == "de_DE").first()
    if not de_locale:
        logger.warning("German locale (de_DE) not found, skipping language setup")
        return

    for org in db.query(CMSSettingsModel).all():
        # Add German to available_languages if not present
        available = org.available_languages or []
        if not any(lang.get("iso_code") == "de" for lang in available):
            available.append(
                {
                    "id": de_locale.id,
                    "name": de_locale.name,
                    "iso_code": de_locale.iso_code,
                }
            )
            org.available_languages = available

        # Set German as default language
        org.default_language_id = de_locale.id

    db.commit()
    logger.info("Set German (de) as default language for all organizations")
