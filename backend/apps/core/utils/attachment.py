import logging
import os

from fastapi import UploadFile
from sqlalchemy.orm import Session

from apps.core.schemas.attachment import AttachmentVersionUpsertItem, UpsertItemResult
from apps.core.utils.models_pool import models_pool

logger = logging.getLogger(__name__)

AttachmentLocaleVersionModel = models_pool["attachment_locale_version"]


def upsert_locale_versions(
    attachment_id: int,
    items: list[AttachmentVersionUpsertItem],
    item_file_map: dict[int, UploadFile],
    db: Session,
    user,
) -> list[UpsertItemResult]:
    """
    Apply batch locale-version upserts for a single attachment.

    Each item is processed independently — a failure on one item does not stop
    the others. The caller receives a per-item result list so it can surface
    partial failures without relying on transaction rollback (which cannot undo
    file-storage operations on S3/Azure/local).

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
        db:             Active SQLAlchemy session.
        user:           Authenticated user passed to ORM create/update/delete calls.

    Returns:
        List of UpsertItemResult, one per item, in the same order as items.
    """
    results: list[UpsertItemResult] = []

    # Step 1: create new locale versions (attachment_locale_version_id is None)
    for idx, item in enumerate(items):
        if item.attachment_locale_version_id is not None:
            continue

        try:
            file = item_file_map[idx]

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

            # Build filename: user-supplied base name + original file extension.
            # Extension comes from the uploaded file (frontend renames it to
            # "<_file_id>.<ext>") and must not be altered.
            _, ext = os.path.splitext(file.filename)
            base = item.name if item.name else os.path.splitext(file.filename)[0]
            file.filename = base + ext

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

            results.append(
                UpsertItemResult(
                    index=idx,
                    locale_id=item.locale_id,
                    attachment_locale_version_id=None,
                    success=True,
                )
            )
        except Exception as exc:
            logger.error(
                "batch_upsert step1 idx=%d locale_id=%d: %s", idx, item.locale_id, exc
            )
            results.append(
                UpsertItemResult(
                    index=idx,
                    locale_id=item.locale_id,
                    attachment_locale_version_id=None,
                    success=False,
                    error=str(exc),
                )
            )

    # Step 2: update existing locale versions (attachment_locale_version_id is not None)
    for idx, item in enumerate(items):
        if item.attachment_locale_version_id is None:
            continue

        try:
            version = (
                db.query(AttachmentLocaleVersionModel)
                .filter(
                    AttachmentLocaleVersionModel.id == item.attachment_locale_version_id
                )
                .first()
            )  # guaranteed to exist — validated by the caller before this function is invoked

            effective_alt = (
                item.alt_text if item.alt_text is not None else version.alt_text
            )

            file = item_file_map.get(idx)
            if file is not None:
                # File replacement: delete the old record and create a new one.
                # The new record gets a new auto-incremented ID — ID is NOT preserved.
                # FE handles this correctly by consuming the full locale_versions list
                # returned in BatchUpsertResponse rather than tracking IDs.
                #
                # Filename = user-supplied base name (item.name, no extension) +
                # extension from the uploaded file. Extension is immutable — it
                # always follows the new file, not the old record.
                existing_base, _ = os.path.splitext(version.name)
                effective_base = item.name if item.name is not None else existing_base
                _, ext = os.path.splitext(file.filename)
                effective_name = effective_base + ext

                version.delete(db=db, user=user)
                file.filename = effective_name
                file.file.seek(0)
                AttachmentLocaleVersionModel().create(
                    db=db,
                    user=user,
                    file=file,
                    attachment_id=attachment_id,
                    locale_id=item.locale_id,
                    alt_text=effective_alt,
                )
            else:
                # Metadata-only update: alt_text and/or file name can change.
                # Name changes are handled via rename_in_storage() so the storage
                # object and the DB record stay in sync.
                update_data = {}
                if effective_alt != version.alt_text:
                    update_data["alt_text"] = effective_alt

                if item.name:
                    existing_base, existing_ext = os.path.splitext(version.name)
                    # Only rename when the requested base name actually differs from
                    # the current one. Extension is always preserved from the existing
                    # file — it cannot be changed without uploading a new file.
                    if item.name != existing_base:
                        version.rename_in_storage(item.name + existing_ext, db=db)

                if update_data:
                    version.update(db=db, user=user, values=update_data)

            results.append(
                UpsertItemResult(
                    index=idx,
                    locale_id=item.locale_id,
                    attachment_locale_version_id=item.attachment_locale_version_id,
                    success=True,
                )
            )
        except Exception as exc:
            logger.error(
                "batch_upsert step2 idx=%d locale_version_id=%d: %s",
                idx,
                item.attachment_locale_version_id,
                exc,
            )
            results.append(
                UpsertItemResult(
                    index=idx,
                    locale_id=item.locale_id,
                    attachment_locale_version_id=item.attachment_locale_version_id,
                    success=False,
                    error=str(exc),
                )
            )

    return results
