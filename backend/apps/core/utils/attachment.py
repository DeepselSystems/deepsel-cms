from fastapi import UploadFile
from sqlalchemy.orm import Session

from apps.core.schemas.attachment import AttachmentVersionUpsertItem
from apps.core.utils.models_pool import models_pool

AttachmentLocaleVersionModel = models_pool["attachment_locale_version"]


def upsert_locale_versions(
    attachment_id: int,
    items: list[AttachmentVersionUpsertItem],
    item_file_map: dict[int, UploadFile],
    db: Session,
    user,
) -> None:
    """
    Apply batch locale-version upserts for a single attachment.

    Step 1 — new versions (attachment_locale_version_id is None):
        Delete any existing version for the same locale, then create a new one.

    Step 2 — existing versions (attachment_locale_version_id is not None):
        If a replacement file is provided (item_file_map contains the item index),
        delete the old version and create a new one preserving the same ID.
        Otherwise update only the metadata fields that changed.

    Args:
        attachment_id:  ID of the parent attachment record.
        items:          Parsed and validated upsert items.
        item_file_map:  Mapping of item list index → UploadFile for items that carry a file.
                        Built by the caller from the multipart files and each item's _file_id.
        db:             Active SQLAlchemy session.
        user:           Authenticated user passed to ORM create/update/delete calls.
    """
    # Step 1: create new locale versions (attachment_locale_version_id is None)
    for idx, item in enumerate(items):
        if item.attachment_locale_version_id is not None:
            continue

        file = item_file_map[idx]

        # Replace semantics: delete existing version for this locale if present
        existing = (
            db.query(AttachmentLocaleVersionModel)
            .filter(
                AttachmentLocaleVersionModel.attachment_id == attachment_id,
                AttachmentLocaleVersionModel.locale_id == item.locale_id,
            )
            .first()
        )
        if existing:
            existing.delete(db=db, user=user)

        if item.name:
            file.filename = item.name

        kwargs = {}
        if item.alt_text:
            kwargs["alt_text"] = item.alt_text

        file.file.seek(0)
        AttachmentLocaleVersionModel().create(
            db=db,
            user=user,
            file=file,
            attachment_id=attachment_id,
            locale_id=item.locale_id,
            **kwargs,
        )

    # Step 2: update existing locale versions (attachment_locale_version_id is not None)
    for idx, item in enumerate(items):
        if item.attachment_locale_version_id is None:
            continue

        version = (
            db.query(AttachmentLocaleVersionModel)
            .filter(
                AttachmentLocaleVersionModel.id == item.attachment_locale_version_id
            )
            .first()
        )  # guaranteed to exist — validated by the caller before this function is invoked

        effective_alt = item.alt_text if item.alt_text is not None else version.alt_text
        effective_name = item.name if item.name is not None else version.name

        file = item_file_map.get(idx)
        if file is not None:
            version.delete(db=db, user=user)

            file.filename = effective_name
            file.file.seek(0)
            AttachmentLocaleVersionModel().create(
                db=db,
                user=user,
                file=file,
                attachment_id=attachment_id,
                locale_id=item.locale_id,
                id=item.attachment_locale_version_id,
                alt_text=effective_alt,
            )
        else:
            update_data = {}
            if effective_alt != version.alt_text:
                update_data["alt_text"] = effective_alt
            if effective_name != version.name:
                update_data["name"] = effective_name
            if update_data:
                version.update(db=db, user=user, **update_data)
