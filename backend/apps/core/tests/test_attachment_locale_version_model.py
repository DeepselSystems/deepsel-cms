"""Tests for AttachmentModel and AttachmentLocaleVersionModel — DB-level invariants
that protect the multi-locale data shape (unique constraints, cascade delete,
get_by_name) and the AttachmentModel.create() override that no longer touches
file storage."""

import pytest
from sqlalchemy.exc import IntegrityError

from apps.core.utils.models_pool import models_pool  # noqa: F401


def _seed(db, iso_code="en"):
    from apps.cms.models.organization import CMSSettingsModel
    from apps.core.models.locale import LocaleModel

    org = CMSSettingsModel(name="Model Test Org")
    db.add(org)
    locale = LocaleModel(iso_code=iso_code, name=iso_code.upper())
    db.add(locale)
    db.commit()
    return org, locale


# ---------- AttachmentLocaleVersionModel: unique constraint ----------


def test_unique_constraint_blocks_duplicate_locale_for_same_attachment(db):
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    org, locale = _seed(db)
    att = AttachmentModel(name="dup-test", organization_id=org.id)
    db.add(att)
    db.flush()

    db.add(
        AttachmentLocaleVersionModel(
            name="dup-test_en.jpg",
            locale_id=locale.id,
            attachment_id=att.id,
            content_type="image/jpeg",
            organization_id=org.id,
        )
    )
    db.add(
        AttachmentLocaleVersionModel(
            name="dup-test-other_en.jpg",
            locale_id=locale.id,
            attachment_id=att.id,
            content_type="image/jpeg",
            organization_id=org.id,
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()


def test_unique_constraint_allows_same_locale_across_different_attachments(db):
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    org, locale = _seed(db)
    att_a = AttachmentModel(name="att-a", organization_id=org.id)
    att_b = AttachmentModel(name="att-b", organization_id=org.id)
    db.add_all([att_a, att_b])
    db.flush()

    db.add(
        AttachmentLocaleVersionModel(
            name="a_en.jpg",
            locale_id=locale.id,
            attachment_id=att_a.id,
            content_type="image/jpeg",
            organization_id=org.id,
        )
    )
    db.add(
        AttachmentLocaleVersionModel(
            name="b_en.jpg",
            locale_id=locale.id,
            attachment_id=att_b.id,
            content_type="image/jpeg",
            organization_id=org.id,
        )
    )
    db.commit()  # Should not raise


def test_locale_version_name_is_globally_unique(db):
    """name is the storage key used in /serve/<name> — globally unique."""
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    org, locale = _seed(db)
    att_a = AttachmentModel(name="att-a", organization_id=org.id)
    att_b = AttachmentModel(name="att-b", organization_id=org.id)
    db.add_all([att_a, att_b])
    db.flush()

    db.add(
        AttachmentLocaleVersionModel(
            name="conflict.jpg",
            locale_id=locale.id,
            attachment_id=att_a.id,
            content_type="image/jpeg",
            organization_id=org.id,
        )
    )
    db.commit()

    db.add(
        AttachmentLocaleVersionModel(
            name="conflict.jpg",
            locale_id=locale.id,
            attachment_id=att_b.id,
            content_type="image/jpeg",
            organization_id=org.id,
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()


# ---------- Cascade delete ----------


def test_deleting_attachment_cascades_to_all_locale_versions(db):
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel
    from apps.core.models.locale import LocaleModel

    org, en_locale = _seed(db, "en")
    de_locale = LocaleModel(iso_code="de", name="DE")
    db.add(de_locale)
    db.commit()

    att = AttachmentModel(name="cascade-test", organization_id=org.id)
    db.add(att)
    db.flush()

    db.add_all(
        [
            AttachmentLocaleVersionModel(
                name="cascade_en.jpg",
                locale_id=en_locale.id,
                attachment_id=att.id,
                content_type="image/jpeg",
                organization_id=org.id,
            ),
            AttachmentLocaleVersionModel(
                name="cascade_de.jpg",
                locale_id=de_locale.id,
                attachment_id=att.id,
                content_type="image/jpeg",
                organization_id=org.id,
            ),
        ]
    )
    db.commit()

    assert db.query(AttachmentLocaleVersionModel).count() == 2  # nosec B101

    db.delete(att)
    db.commit()

    assert db.query(AttachmentLocaleVersionModel).count() == 0  # nosec B101


# ---------- AttachmentModel.get_by_name ----------


def test_get_by_name_returns_matching_attachment(db):
    from apps.core.models.attachment import AttachmentModel

    org, _ = _seed(db)
    att = AttachmentModel(name="findable", organization_id=org.id)
    db.add(att)
    db.commit()

    found = AttachmentModel.get_by_name(db, "findable")
    assert found is not None  # nosec B101
    assert found.id == att.id  # nosec B101


def test_get_by_name_returns_none_when_missing(db):
    from apps.core.models.attachment import AttachmentModel

    assert AttachmentModel.get_by_name(db, "does-not-exist") is None  # nosec B101


# ---------- AttachmentModel.create (DB-only override) ----------


def test_attachment_create_is_db_only_no_file_metadata(db):
    """The overridden create() makes a bare container — no type/content_type/
    filesize. All file metadata lives on AttachmentLocaleVersionModel rows."""
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.user import UserModel

    org, _ = _seed(db)
    user = UserModel(username="u", email="u@test.com")
    db.add(user)
    db.commit()

    att = AttachmentModel.create(
        db=db,
        user=user,
        values={
            "name": "db-only",
            "organization_id": org.id,
        },
        bypass_permission=True,
    )

    assert att.id is not None  # nosec B101
    assert att.name == "db-only"  # nosec B101
    assert att.type is None  # nosec B101
    assert att.content_type is None  # nosec B101
    assert att.filesize is None  # nosec B101
    assert att.alt_text is None  # nosec B101
    assert att.owner_id == user.id  # nosec B101
    assert att.organization_id == org.id  # nosec B101
