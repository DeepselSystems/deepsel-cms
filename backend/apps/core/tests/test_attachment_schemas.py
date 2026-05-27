"""Tests for the Pydantic validators on attachment request/response schemas.
The batch_upsert endpoint relies on these validators to reject malformed items
before any DB work happens — covered here without a TestClient."""

import pytest
from pydantic import ValidationError

from apps.core.schemas.attachment import AttachmentVersionUpsertItem


def test_update_item_accepts_partial_fields():
    """Existing-version updates (id is set) — every other field is optional."""
    item = AttachmentVersionUpsertItem(attachment_locale_version_id=42, locale_id=1)
    assert item.attachment_locale_version_id == 42  # nosec B101
    assert item.name is None  # nosec B101
    assert item.file_id is None  # nosec B101


def test_update_item_accepts_alt_text_only_change():
    item = AttachmentVersionUpsertItem(
        attachment_locale_version_id=42, locale_id=1, alt_text="new alt"
    )
    assert item.alt_text == "new alt"  # nosec B101


def test_new_version_requires_file_id_and_name():
    """Creating a new version requires both _file_id and name."""
    with pytest.raises(ValidationError) as exc:
        AttachmentVersionUpsertItem(locale_id=1)
    msg = str(exc.value)
    assert "_file_id" in msg  # nosec B101
    assert "name" in msg  # nosec B101


def test_new_version_requires_file_id_when_name_supplied():
    with pytest.raises(ValidationError) as exc:
        AttachmentVersionUpsertItem(locale_id=1, name="report")
    assert "_file_id" in str(exc.value)  # nosec B101


def test_new_version_requires_name_when_file_id_supplied():
    with pytest.raises(ValidationError) as exc:
        AttachmentVersionUpsertItem(locale_id=1, **{"_file_id": "report"})
    assert "name" in str(exc.value)  # nosec B101


def test_new_version_accepts_when_both_required_fields_present():
    item = AttachmentVersionUpsertItem(
        locale_id=1, name="report", **{"_file_id": "report"}
    )
    assert item.attachment_locale_version_id is None  # nosec B101
    assert item.file_id == "report"  # alias resolved  # nosec B101


def test_locale_id_is_required_always():
    """locale_id has no default — must always be provided."""
    with pytest.raises(ValidationError) as exc:
        AttachmentVersionUpsertItem(attachment_locale_version_id=1)
    assert "locale_id" in str(exc.value)  # nosec B101


def test_file_id_alias_accepts_both_underscore_and_python_name():
    """populate_by_name=True means both '_file_id' and 'file_id' work."""
    by_alias = AttachmentVersionUpsertItem(locale_id=1, name="x", **{"_file_id": "x"})
    by_name = AttachmentVersionUpsertItem(locale_id=1, name="x", file_id="x")
    assert by_alias.file_id == by_name.file_id == "x"  # nosec B101
