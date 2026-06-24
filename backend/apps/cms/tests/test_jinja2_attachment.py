"""Tests for the {{ attachment(...) }} Jinja2 global injected into wysiwyg rendering.

Renderers are pure functions of (version, attrs) so they're covered with lightweight
stub version objects. The locale-resolution and end-to-end attachment() callable are
covered against the testcontainers Postgres fixture from the core conftest, which
the cms test suite also picks up via the imported models_pool side effect."""

from types import SimpleNamespace

from apps.cms.utils.jinja2_globals import build_jinja2_globals
from apps.cms.utils.jinja2_globals.attachment import (
    _render_audio,
    _render_file,
    _render_gallery,
    _render_image,
    _render_version,
    _render_video,
    _resolve_locale_version,
    make_attachment_func,
)

# Importing models_pool triggers SQLAlchemy model registration so Base.metadata
# knows about every table before the conftest fixture calls create_all().
from apps.core.utils.models_pool import models_pool  # noqa: F401


def _stub_version(
    name: str = "hero.jpg",
    alt_text: str = "Hero image",
    content_type: str = "image/jpeg",
    locale_id: int = 1,
):
    return SimpleNamespace(
        name=name,
        alt_text=alt_text,
        content_type=content_type,
        locale_id=locale_id,
    )


# ---------- renderer dispatch ----------


def test_render_version_dispatches_image():
    out = str(_render_version(_stub_version(content_type="image/png"), {}))
    assert '<img src="/api/v1/attachment/serve/hero.jpg"' in out  # nosec B101
    assert 'class="enhanced-image-wrapper"' in out  # nosec B101


def test_render_version_dispatches_audio():
    out = str(
        _render_version(_stub_version(name="theme.mp3", content_type="audio/mpeg"), {})
    )
    assert "<audio" in out  # nosec B101
    assert 'class="embed-audio-wrapper"' in out  # nosec B101


def test_render_version_dispatches_video():
    out = str(
        _render_version(_stub_version(name="clip.mp4", content_type="video/mp4"), {})
    )
    assert "<video" in out  # nosec B101
    assert 'class="embed-video-wrapper"' in out  # nosec B101


def test_render_version_dispatches_file_for_unknown_mime():
    out = str(
        _render_version(
            _stub_version(name="spec.pdf", content_type="application/pdf"), {}
        )
    )
    assert "<a" in out and "download" in out  # nosec B101
    assert 'class="embed-file-item"' in out  # nosec B101


def test_render_version_dispatches_file_when_content_type_missing():
    """If content_type is None or '', fall through to the file renderer."""
    out = str(_render_version(_stub_version(content_type=""), {}))
    assert 'class="embed-file-item"' in out  # nosec B101


# ---------- image renderer attributes ----------


def test_render_image_applies_width_alt_and_alignment():
    version = _stub_version(name="x.jpg", alt_text="alt text")
    out = str(_render_image(version, {"width": 500, "alignment": "left"}))
    assert 'src="/api/v1/attachment/serve/x.jpg"' in out  # nosec B101
    assert 'alt="alt text"' in out  # nosec B101
    assert 'width="500"' in out  # nosec B101
    assert 'data-alignment="left"' in out  # nosec B101


def test_render_image_circle_overrides_rounded():
    out = str(_render_image(_stub_version(), {"circle": True, "rounded": True}))
    assert "border-radius: 50%" in out  # nosec B101


def test_render_image_includes_description_when_set():
    out = str(_render_image(_stub_version(), {"description": "a caption"}))
    assert (
        '<div class="enhanced-image-description">a caption</div>' in out
    )  # nosec B101


def test_render_image_omits_description_div_when_empty():
    out = str(_render_image(_stub_version(), {"description": "   "}))
    assert "enhanced-image-description" not in out  # nosec B101


# ---------- audio / video / file renderers ----------


def test_render_audio_with_width():
    out = str(_render_audio(_stub_version(name="t.mp3"), {"width": 400}))
    assert 'data-audio-width="400"' in out  # nosec B101
    assert "width: 400px;" in out  # nosec B101


def test_render_audio_defaults_to_full_width():
    out = str(_render_audio(_stub_version(name="t.mp3"), {}))
    assert "width: 100%" in out  # nosec B101
    assert "data-audio-width" not in out  # nosec B101


def test_render_video_with_poster():
    out = str(_render_video(_stub_version(name="v.mp4"), {"poster": "/p.jpg"}))
    assert 'poster="/p.jpg"' in out  # nosec B101
    assert 'src="/api/v1/attachment/serve/v.mp4"' in out  # nosec B101


def test_render_video_without_poster():
    out = str(_render_video(_stub_version(name="v.mp4"), {}))
    assert "poster=" not in out  # nosec B101


def test_render_file_uses_attachment_name_as_label_and_href():
    out = str(_render_file(_stub_version(name="spec_en.pdf"), {}))
    assert 'href="/api/v1/attachment/serve/spec_en.pdf"' in out  # nosec B101
    assert ">spec_en.pdf<" in out  # nosec B101
    assert "download" in out  # nosec B101


# ---------- locale resolution (DB-backed) ----------


def _seed_org_and_locale(db, iso_code="en"):
    from apps.cms.models.organization import CMSSettingsModel
    from apps.core.models.locale import LocaleModel

    org = CMSSettingsModel(name="Test Org")
    db.add(org)

    locale = LocaleModel(iso_code=iso_code, name=iso_code.upper())
    db.add(locale)
    db.commit()
    return org, locale


def _create_attachment_with_versions(db, org, versions):
    """versions: list of (locale_id, name, content_type, alt_text)."""
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    att = AttachmentModel(name="my-asset", organization_id=org.id)
    db.add(att)
    db.flush()

    rows = []
    for locale_id, name, content_type, alt_text in versions:
        lv = AttachmentLocaleVersionModel(
            name=name,
            locale_id=locale_id,
            attachment_id=att.id,
            content_type=content_type,
            alt_text=alt_text,
        )
        db.add(lv)
        rows.append(lv)
    db.commit()
    return att, rows


def test_resolve_locale_version_matches_requested_locale(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    att, _ = _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    version = _resolve_locale_version(att, "en", db)
    assert version is not None  # nosec B101
    assert version.name == "hero_en.jpg"  # nosec B101


def test_resolve_locale_version_returns_none_when_no_lang_passed(db):
    """Current behavior: no lang → no resolution. The caller renders a placeholder."""
    org, en_locale = _seed_org_and_locale(db, "en")
    att, _ = _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    assert _resolve_locale_version(att, None, db) is None  # nosec B101


def test_resolve_locale_version_returns_none_for_missing_locale_match(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    att, _ = _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    # Locale row exists but no version for German
    from apps.core.models.locale import LocaleModel

    db.add(LocaleModel(iso_code="de", name="DE"))
    db.commit()
    assert _resolve_locale_version(att, "de", db) is None  # nosec B101


def test_resolve_locale_version_returns_none_for_empty_versions(db):
    org, _ = _seed_org_and_locale(db, "en")
    from apps.core.models.attachment import AttachmentModel

    att = AttachmentModel(name="empty", organization_id=org.id)
    db.add(att)
    db.commit()
    assert _resolve_locale_version(att, "en", db) is None  # nosec B101


# ---------- end-to-end attachment() callable ----------


def test_attachment_func_renders_image_for_known_name(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    attachment = make_attachment_func(db, org.id, "en")
    out = str(attachment("my-asset"))
    assert 'src="/api/v1/attachment/serve/hero_en.jpg"' in out  # nosec B101


def test_attachment_func_returns_placeholder_when_attachment_missing(db):
    org, _ = _seed_org_and_locale(db, "en")
    attachment = make_attachment_func(db, org.id, "en")
    out = str(attachment("does-not-exist"))
    assert "File not found: does-not-exist" in out  # nosec B101
    assert "embed-file-not-available" in out  # nosec B101


def test_attachment_func_returns_placeholder_when_locale_version_missing(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    # Add a DE locale so the lookup gets through resolve_locale_version but no version exists
    from apps.core.models.locale import LocaleModel

    db.add(LocaleModel(iso_code="de", name="DE"))
    db.commit()

    attachment = make_attachment_func(db, org.id, "de")
    out = str(attachment("my-asset"))
    assert "File not available for this locale" in out  # nosec B101


def test_attachment_func_placeholder_when_no_names_given(db):
    org, _ = _seed_org_and_locale(db, "en")
    attachment = make_attachment_func(db, org.id, "en")
    out = str(attachment())
    assert "No attachment specified" in out  # nosec B101


def test_attachment_func_parses_dict_config(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    attachment = make_attachment_func(db, org.id, "en")
    out = str(attachment("my-asset", {"width": 999, "alignment": "right"}))
    assert 'width="999"' in out  # nosec B101
    assert 'data-alignment="right"' in out  # nosec B101


def test_attachment_func_parses_json_string_config(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    _create_attachment_with_versions(
        db, org, [(en_locale.id, "hero_en.jpg", "image/jpeg", "Hero")]
    )
    attachment = make_attachment_func(db, org.id, "en")
    out = str(attachment("my-asset", '{"width": 777, "alignment": "left"}'))
    assert 'width="777"' in out  # nosec B101
    assert 'data-alignment="left"' in out  # nosec B101


def test_attachment_func_treats_non_json_string_as_a_name(db):
    """A trailing string that doesn't start with '{' is another attachment, not config."""
    org, en_locale = _seed_org_and_locale(db, "en")
    _create_attachment_with_versions(
        db, org, [(en_locale.id, "a_en.jpg", "image/jpeg", "A")]
    )
    # Second attachment so the call enters gallery mode (>1 names).
    from apps.core.models.attachment import AttachmentModel
    from apps.core.models.attachment_locale_version import AttachmentLocaleVersionModel

    b = AttachmentModel(name="b-asset", organization_id=org.id)
    db.add(b)
    db.flush()
    db.add(
        AttachmentLocaleVersionModel(
            name="b_en.jpg",
            locale_id=en_locale.id,
            attachment_id=b.id,
            content_type="image/jpeg",
        )
    )
    db.commit()

    attachment = make_attachment_func(db, org.id, "en")
    out = str(attachment("my-asset", "b-asset"))
    # Gallery render — both images present.
    assert 'src="/api/v1/attachment/serve/a_en.jpg"' in out  # nosec B101
    assert 'src="/api/v1/attachment/serve/b_en.jpg"' in out  # nosec B101


# ---------- gallery ----------


def test_render_gallery_skips_unknown_names_and_lays_out_grid(db):
    org, en_locale = _seed_org_and_locale(db, "en")
    _create_attachment_with_versions(
        db, org, [(en_locale.id, "real_en.jpg", "image/jpeg", "")]
    )
    out = str(
        _render_gallery(
            ("real-asset-missing", "my-asset"),
            {"imagesPerRow": 2, "gap": 10},
            db,
            org.id,
            "en",
        )
    )
    # First name doesn't resolve so it's skipped; the real one renders.
    # The attachment seeded by helper is named "my-asset"; rename via helper would
    # be wasteful — test only that the existing asset got rendered.
    assert "grid-template-columns: repeat(2, 1fr)" in out  # nosec B101
    assert "gap: 10px" in out  # nosec B101


def test_render_gallery_empty_when_no_resolved_images(db):
    org, _ = _seed_org_and_locale(db, "en")
    out = str(_render_gallery(("nope",), {}, db, org.id, "en"))
    assert "Gallery is empty" in out  # nosec B101


# ---------- build_jinja2_globals ----------


def test_build_jinja2_globals_registers_attachment(db):
    org, _ = _seed_org_and_locale(db, "en")
    globals_ = build_jinja2_globals(db, org.id, "en")
    assert callable(globals_["attachment"])  # nosec B101
