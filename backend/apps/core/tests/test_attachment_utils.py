"""Unit tests for attachment utility helpers in apps.core.utils.attachment.

Pure-function tests cover _extract_attachment_names (used to confirm SQL LIKE
matches in find_attachment_usages). DB-backed tests cover
resolve_unique_attachment_name and find_attachment_usages against the
testcontainers Postgres fixture from the core conftest."""

from apps.core.utils.attachment import (
    _extract_attachment_names,
    find_attachment_usages,
    resolve_unique_attachment_name,
)
from apps.core.utils.models_pool import models_pool  # noqa: F401

# ---------- _extract_attachment_names (pure) ----------


def test_extract_names_single_image():
    content = "<p>{{ attachment('hero') }}</p>"
    assert _extract_attachment_names(content) == {"hero"}  # nosec B101


def test_extract_names_gallery_skips_trailing_json_config():
    content = "{{ attachment('a', 'b', 'c', '{\"imagesPerRow\":3}') }}"
    assert _extract_attachment_names(content) == {"a", "b", "c"}  # nosec B101


def test_extract_names_with_dict_style_config_keeps_only_names():
    # When the last quoted arg is JSON it's stripped; non-JSON trailing string is kept.
    content = "{{ attachment('hero', 'banner') }}"
    assert _extract_attachment_names(content) == {"hero", "banner"}  # nosec B101


def test_extract_names_handles_leading_dash_whitespace_control():
    content = "{{- attachment('hero') }}"  # leading dash whitespace control
    assert _extract_attachment_names(content) == {"hero"}  # nosec B101


def test_extract_names_handles_trailing_dash_whitespace_control():
    content = "{{ attachment('hero') -}}"  # trailing dash whitespace control
    assert _extract_attachment_names(content) == {"hero"}  # nosec B101


def test_extract_names_handles_both_dash_whitespace_controls():
    content = "{{- attachment('hero') -}}"
    assert _extract_attachment_names(content) == {"hero"}  # nosec B101


def test_extract_names_multiple_calls_aggregated():
    content = (
        "{{ attachment('one') }}<p>x</p>{{ attachment('two', 'three') }}"
        "<div>{{ attachment('one') }}</div>"  # dup — set dedupes
    )
    assert _extract_attachment_names(content) == {"one", "two", "three"}  # nosec B101


def test_extract_names_empty_when_no_calls():
    assert _extract_attachment_names("<p>hello world</p>") == set()  # nosec B101
    assert _extract_attachment_names("") == set()  # nosec B101


def test_extract_names_does_not_match_word_attachment_outside_jinja_call():
    """Bare 'attachment' references in prose must not be picked up."""
    content = "<p>An attachment is needed here.</p>"
    assert _extract_attachment_names(content) == set()  # nosec B101


# ---------- resolve_unique_attachment_name (DB) ----------


def _add_attachment(db, name, org_id):
    from apps.core.models.attachment import AttachmentModel

    db.add(AttachmentModel(name=name, organization_id=org_id))


def test_resolve_unique_attachment_name_returns_base_when_unused(db):
    name = resolve_unique_attachment_name("report.pdf", db)
    assert name == "report"  # nosec B101


def test_resolve_unique_attachment_name_appends_suffix_on_conflict(db):
    org, _ = _seed_org_and_locale(db)
    _add_attachment(db, "report", org.id)
    db.commit()

    name = resolve_unique_attachment_name("report.pdf", db)
    assert name == "report-1"  # nosec B101


def test_resolve_unique_attachment_name_chain_of_conflicts(db):
    org, _ = _seed_org_and_locale(db)
    for n in ("img", "img-1", "img-2"):
        _add_attachment(db, n, org.id)
    db.commit()
    name = resolve_unique_attachment_name("img.jpg", db)
    assert name == "img-3"  # nosec B101


def test_resolve_unique_attachment_name_falls_back_when_filename_empty(db):
    name = resolve_unique_attachment_name("", db)
    assert name == "file"  # nosec B101


# ---------- find_attachment_usages (DB) ----------


def _seed_org_and_locale(db, iso_code="en"):
    from apps.cms.models.organization import CMSSettingsModel
    from apps.core.models.locale import LocaleModel

    org = CMSSettingsModel(name="Usage Test Org")
    db.add(org)
    locale = LocaleModel(iso_code=iso_code, name=iso_code.upper())
    db.add(locale)
    db.commit()
    return org, locale


def _create_attachment(db, org, name):
    from apps.core.models.attachment import AttachmentModel

    att = AttachmentModel(name=name, organization_id=org.id)
    db.add(att)
    db.commit()
    return att


def _create_page_with_content(db, org, locale, *, content, draft_content=None):
    from apps.cms.models.page import PageModel
    from apps.cms.models.page_content import PageContentModel

    page = PageModel(organization_id=org.id)
    db.add(page)
    db.flush()

    pc = PageContentModel(
        page_id=page.id,
        locale_id=locale.id,
        title="page title",
        content=content,
        draft_content=draft_content,
        organization_id=org.id,
    )
    db.add(pc)
    db.commit()
    return page, pc


def test_find_attachment_usages_finds_jinja_call_in_page(db):
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "hero")
    _create_page_with_content(
        db, org, locale, content="<p>{{ attachment('hero') }}</p>"
    )

    usages = find_attachment_usages(
        attachment_name="hero",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    assert len(usages) == 1  # nosec B101
    assert usages[0].content_type == "page"  # nosec B101
    assert usages[0].is_draft is False  # nosec B101
    assert usages[0].edit_path.startswith("/pages/")  # nosec B101


def test_find_attachment_usages_reports_draft_separately(db):
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "hero")
    _create_page_with_content(
        db,
        org,
        locale,
        content="<p>nothing here</p>",
        draft_content="{{ attachment('hero') }}",
    )

    usages = find_attachment_usages(
        attachment_name="hero",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    # Only the draft usage — published content does not reference the attachment.
    assert len(usages) == 1  # nosec B101
    assert usages[0].is_draft is True  # nosec B101


def test_find_attachment_usages_returns_both_published_and_draft(db):
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "hero")
    _create_page_with_content(
        db,
        org,
        locale,
        content="{{ attachment('hero') }}",
        draft_content="{{ attachment('hero') }}",
    )

    usages = find_attachment_usages(
        attachment_name="hero",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    flags = sorted(u.is_draft for u in usages)
    assert flags == [False, True]  # nosec B101


def test_find_attachment_usages_locale_filter_narrows_results(db):
    from apps.core.models.locale import LocaleModel

    org, en_locale = _seed_org_and_locale(db, "en")
    de_locale = LocaleModel(iso_code="de", name="DE")
    db.add(de_locale)
    db.commit()
    att = _create_attachment(db, org, "hero")
    # English page references hero
    _create_page_with_content(db, org, en_locale, content="{{ attachment('hero') }}")
    # German page also references hero — separate row
    _create_page_with_content(db, org, de_locale, content="{{ attachment('hero') }}")

    en_usages = find_attachment_usages(
        attachment_name="hero",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
        locale_id=en_locale.id,
    )
    assert len(en_usages) == 1  # nosec B101
    assert en_usages[0].locale_id == en_locale.id  # nosec B101


def test_find_attachment_usages_dedupes_jinja_and_fk_in_same_row(db):
    """The same row referencing the attachment in both a Jinja call and the SEO
    featured_image_id FK column should produce only ONE usage entry per is_draft
    flavor — the seen-set in find_attachment_usages must dedupe."""
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "hero")
    _, pc = _create_page_with_content(
        db, org, locale, content="{{ attachment('hero') }}"
    )
    pc.seo_metadata_featured_image_id = att.id
    db.commit()

    usages = find_attachment_usages(
        attachment_name="hero",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    page_published = [
        u for u in usages if u.content_type == "page" and u.is_draft is False
    ]
    assert len(page_published) == 1  # nosec B101


def test_find_attachment_usages_finds_fk_only_reference(db):
    """A page that references the attachment only via SEO featured_image_id
    (no Jinja call) still gets surfaced — the second pass on FK columns
    catches it after the text-search pass returns nothing."""
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "logo")
    _, pc = _create_page_with_content(db, org, locale, content="<p>no jinja here</p>")
    pc.seo_metadata_featured_image_id = att.id
    db.commit()

    usages = find_attachment_usages(
        attachment_name="logo",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    assert len(usages) == 1  # nosec B101
    assert usages[0].content_type == "page"  # nosec B101


def test_find_attachment_usages_no_results_for_unreferenced_attachment(db):
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "unused")
    _create_page_with_content(
        db, org, locale, content="<p>nothing references unused</p>"
    )
    usages = find_attachment_usages(
        attachment_name="unused",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    assert usages == []  # nosec B101


def test_find_attachment_usages_like_pattern_does_not_match_substring(db):
    """The LIKE pattern is `%attachment(%%'<name>'%`. A page referencing
    'hero-banner' must not appear in a search for 'hero'."""
    org, locale = _seed_org_and_locale(db)
    att = _create_attachment(db, org, "hero")
    _create_page_with_content(
        db, org, locale, content="{{ attachment('hero-banner') }}"
    )
    usages = find_attachment_usages(
        attachment_name="hero",
        attachment_id=att.id,
        db=db,
        organization_id=org.id,
    )
    assert usages == []  # nosec B101


def test_find_attachment_usages_does_not_leak_across_organizations(db):
    """Cross-tenant isolation: a page in Org B referencing the same attachment
    name must NOT appear when querying usages for Org A's attachment.

    Before the fix to require organization_id on the content queries, this
    cross-tenant pollution silently exposed page IDs and titles from one tenant
    to another via the /usages endpoint."""
    from apps.cms.models.organization import CMSSettingsModel
    from apps.cms.models.page import PageModel
    from apps.cms.models.page_content import PageContentModel
    from apps.core.models.locale import LocaleModel

    # Org A — owns the attachment we'll be querying for
    org_a = CMSSettingsModel(name="Org A")
    db.add(org_a)
    # Org B — has a page referencing the same slug but should be invisible
    org_b = CMSSettingsModel(name="Org B")
    db.add(org_b)
    locale = LocaleModel(iso_code="en", name="EN")
    db.add(locale)
    db.commit()

    att_a = _create_attachment(db, org_a, "shared-slug")

    # Org B page references the same slug — under the old code, this leaked.
    page_b = PageModel(organization_id=org_b.id)
    db.add(page_b)
    db.flush()
    db.add(
        PageContentModel(
            page_id=page_b.id,
            locale_id=locale.id,
            title="Org B's private page",
            content="{{ attachment('shared-slug') }}",
            organization_id=org_b.id,
        )
    )
    db.commit()

    usages = find_attachment_usages(
        attachment_name="shared-slug",
        attachment_id=att_a.id,
        db=db,
        organization_id=org_a.id,
    )
    # Org B's page must not surface here.
    assert usages == []  # nosec B101


def test_find_attachment_usages_does_not_leak_fk_across_organizations(db):
    """The FK-based pass also has to be org-scoped — without the filter,
    a blog_post_content in Org B pointing at a same-named attachment in Org A
    by id would appear in Org A's usages list."""
    from apps.cms.models.organization import CMSSettingsModel
    from apps.cms.models.blog_post import BlogPostModel
    from apps.cms.models.blog_post_content import BlogPostContentModel
    from apps.core.models.locale import LocaleModel

    org_a = CMSSettingsModel(name="Org A FK")
    org_b = CMSSettingsModel(name="Org B FK")
    db.add_all([org_a, org_b])
    locale = LocaleModel(iso_code="en", name="EN")
    db.add(locale)
    db.commit()

    att_a = _create_attachment(db, org_a, "logo")

    post_b = BlogPostModel(organization_id=org_b.id)
    db.add(post_b)
    db.flush()
    db.add(
        BlogPostContentModel(
            post_id=post_b.id,
            locale_id=locale.id,
            title="Org B blog with leaked FK",
            content="<p>no jinja</p>",
            featured_image_id=att_a.id,  # FK pointing at Org A's attachment
            organization_id=org_b.id,
        )
    )
    db.commit()

    usages = find_attachment_usages(
        attachment_name="logo",
        attachment_id=att_a.id,
        db=db,
        organization_id=org_a.id,
    )
    assert usages == []  # nosec B101
