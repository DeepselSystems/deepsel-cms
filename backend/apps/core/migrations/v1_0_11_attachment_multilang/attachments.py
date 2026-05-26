import logging
import os
import re

logger = logging.getLogger(__name__)

# Matches locale suffix added by the old single-file attachment system (_de, _en, _fr, _it)
_LOCALE_SUFFIX_RE = re.compile(r"_(?:de|en|fr|it)$", re.IGNORECASE)

# All locales that ch-theme requires one file per attachment
THEME_LOCALES = ["de", "fr", "en", "it"]


def migrate_attachments(db) -> None:
    """Clean up orphaned attachment records and fix naming inconsistencies."""
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    targets = (
        db.query(AttachmentModel)
        .filter(
            AttachmentModel.type.isnot(None),
            AttachmentModel.content_type.isnot(None),
        )
        .all()
    )

    # Keep only those with no locale versions yet
    targets = [
        a
        for a in targets
        if not db.query(AttachmentLocaleVersionModel)
        .filter_by(attachment_id=a.id)
        .count()
    ]

    # Group 1: confoederatio_helvetica theme attachments
    theme_group = [a for a in targets if a.name and a.name.startswith("eiam_ch_")]

    # Group 2: generic uploads (everything else)
    generic_group = [a for a in targets if a not in theme_group]

    logger.info(
        f"[attachments] Found {len(targets)} to migrate"
        f" — theme={len(theme_group)}, generic={len(generic_group)}"
    )
    for a in theme_group:
        logger.info(
            f"  [theme]   id={a.id} name={a.name!r} type={a.type} content_type={a.content_type}"
        )
    for a in generic_group:
        logger.info(
            f"  [generic] id={a.id} name={a.name!r} type={a.type} content_type={a.content_type}"
        )

    _migrate_ch_theme_attachments(db, theme_group)
    _migrate_generic_attachments(db, generic_group)


def _migrate_ch_theme_attachments(db, attachments: list) -> None:
    """Handle old-structure attachments belonging to "confoederatio_helvetica" theme."""
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    ok = 0
    failed = 0

    for attachment in attachments:
        try:
            old_name = attachment.name or ""
            base, ext = os.path.splitext(old_name)
            slug = _LOCALE_SUFFIX_RE.sub("", base)

            lv_names = {locale: f"{slug}_{locale}{ext}" for locale in THEME_LOCALES}

            old_file_reused = False

            for locale, lv_name in lv_names.items():
                # actual_lv_name starts as the intended locale-suffixed name.
                # If the storage clone fails it falls back to old_name so the
                # DB row always points to a file that physically exists.
                actual_lv_name = lv_name
                if lv_name == old_name:
                    old_file_reused = True
                else:
                    try:
                        AttachmentLocaleVersionModel.clone_in_storage(
                            old_name, lv_name, db=db, auto_unique=False
                        )
                    except Exception as file_exc:
                        logger.error(
                            f"[theme] id={attachment.id}: clone {old_name!r} → {lv_name!r} FAILED — {file_exc}"
                        )
                        actual_lv_name = old_name

                lv = AttachmentLocaleVersionModel(
                    name=actual_lv_name,
                    type=attachment.type,
                    content_type=attachment.content_type,
                    filesize=attachment.filesize,
                    alt_text=attachment.alt_text,
                    attachment_id=attachment.id,
                    locale_id=_resolve_locale_id(db, locale),
                    string_id=None,
                    owner_id=attachment.owner_id,
                    organization_id=attachment.organization_id,
                )
                db.add(lv)

            db.flush()

            if not old_file_reused:
                try:
                    AttachmentLocaleVersionModel.delete_from_storage(
                        old_name, attachment.type
                    )
                except Exception as file_exc:
                    logger.error(
                        f"[theme] id={attachment.id}: delete {old_name!r} FAILED — {file_exc}"
                    )

            attachment.name = slug
            attachment.string_id = slug
            attachment.type = None
            attachment.content_type = None
            attachment.filesize = None
            attachment.alt_text = None

            logger.info(
                f"[theme] id={attachment.id}: '{old_name}' → slug='{slug}'"
                f" reused={old_file_reused}"
            )
            ok += 1

        except Exception as exc:
            logger.error(f"[theme] id={attachment.id}: FAILED — {exc}", exc_info=True)
            failed += 1

    logger.info(f"[theme] done — ok={ok}, failed={failed}")


def _resolve_locale_id(db, iso_code: str) -> int:
    from apps.core.models.locale import LocaleModel

    locale = db.query(LocaleModel).filter_by(iso_code=iso_code).first()
    if not locale:
        raise ValueError(f"Locale '{iso_code}' not found in database")
    return locale.id


def _migrate_generic_attachments(db, attachments: list) -> None:
    """
    Migrate old single-file attachments to the new locale-version structure.

    For each attachment:
    - Derives a clean slug from the old name (strips extension + locale suffix).
    - Creates one AttachmentLocaleVersionModel record for the org's default locale.
    - Renames the physical file to include the locale suffix.
    - Clears the deprecated fields on the parent attachment.
    """
    from apps.cms.models.organization import CMSSettingsModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel
    from apps.core.models.locale import LocaleModel

    ok = 0
    failed = 0

    for attachment in attachments:
        try:
            # -- Resolve default locale for this org --
            org = (
                db.query(CMSSettingsModel)
                .filter_by(id=attachment.organization_id)
                .first()
            )
            if not org or not org.default_language_id:
                logger.warning(
                    f"[generic] id={attachment.id}: org/default_language_id not found — skip"
                )
                failed += 1
                continue

            locale = db.query(LocaleModel).filter_by(id=org.default_language_id).first()
            if not locale:
                logger.warning(
                    f"[generic] id={attachment.id}: locale id={org.default_language_id} not found — skip"
                )
                failed += 1
                continue

            locale_iso = locale.iso_code  # e.g. "de"

            # -- Derive clean slug and new lv storage key --
            old_name = attachment.name or ""
            base, ext = os.path.splitext(old_name)
            clean_base = _LOCALE_SUFFIX_RE.sub("", base)
            new_lv_name = f"{clean_base}_{locale_iso}{ext}"
            new_slug = clean_base

            # -- Create locale version record pointing at the current file location --
            lv = AttachmentLocaleVersionModel(
                name=old_name,  # temporarily old storage key; renamed below
                type=attachment.type,
                content_type=attachment.content_type,
                filesize=attachment.filesize,
                alt_text=attachment.alt_text,
                attachment_id=attachment.id,
                locale_id=locale.id,
                string_id=None,
                owner_id=attachment.owner_id,
                organization_id=attachment.organization_id,
            )
            db.add(lv)
            db.flush()  # assign lv.id without committing the transaction

            # -- Rename physical file (update_db=False: name updated manually below) --
            try:
                lv.rename_in_storage(
                    new_lv_name, db=db, update_db=False, auto_unique=False
                )
                lv.name = new_lv_name
            except Exception as file_exc:
                logger.error(
                    f"[generic] id={attachment.id}: rename {old_name!r} → {new_lv_name!r} FAILED — {file_exc}"
                )
                # lv.name stays as old_name so the DB row points to the existing file

            # -- Update parent attachment: clean slug, clear deprecated fields --
            # string_id is preserved as-is (None stays None)
            attachment.name = new_slug
            attachment.type = None
            attachment.content_type = None
            attachment.filesize = None
            attachment.alt_text = None

            logger.info(
                f"[generic] id={attachment.id}: '{old_name}' → slug='{new_slug}'"
                f" lv='{new_lv_name}' locale={locale_iso}"
            )
            ok += 1

        except Exception as exc:
            logger.error(f"[generic] id={attachment.id}: FAILED — {exc}", exc_info=True)
            failed += 1

    logger.info(f"[generic] done — ok={ok}, failed={failed}")
