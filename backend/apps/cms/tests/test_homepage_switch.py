import pytest
from sqlalchemy.orm import Session

from apps.cms.models.page import PageModel
from apps.cms.models.page_content import PageContentModel
from apps.locales.models.locale import LocaleModel
from apps.deepsel.models.organization import OrganizationModel


@pytest.fixture
def org(db: Session) -> OrganizationModel:
    """Create a default organization for tests."""
    o = OrganizationModel(name="Test Org")
    db.add(o)
    db.commit()
    db.refresh(o)
    return o


@pytest.fixture
def locale(db: Session) -> LocaleModel:
    """Create a test locale."""
    loc = LocaleModel(name="English", iso_code="en")
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@pytest.fixture
def locale_fr(db: Session) -> LocaleModel:
    """Create a second test locale (French)."""
    loc = LocaleModel(name="French", iso_code="fr")
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


def _make_page(db: Session, org_id: int, is_homepage: bool = False) -> PageModel:
    page = PageModel(is_homepage=is_homepage, organization_id=org_id)
    db.add(page)
    db.flush()
    return page


def _make_content(
    db: Session,
    page: PageModel,
    locale: LocaleModel,
    org_id: int,
    title: str,
    slug: str,
) -> PageContentModel:
    content = PageContentModel(
        title=title,
        slug=slug,
        locale_id=locale.id,
        page_id=page.id,
        organization_id=org_id,
    )
    db.add(content)
    db.flush()
    return content


def test_switch_homepage_resolves_old_homepage_slug(
    db: Session, org: OrganizationModel, locale: LocaleModel
):
    """Switching homepage unsets old homepage and regenerates its slug."""
    # Page A is the current homepage with slug /
    page_a = _make_page(db, org.id, is_homepage=True)
    content_a = _make_content(db, page_a, locale, org.id, "Home Page", "/")

    # Page B will become the new homepage
    page_b = _make_page(db, org.id, is_homepage=False)
    _make_content(db, page_b, locale, org.id, "About", "/about")

    db.commit()

    # Simulate switching page_b to homepage
    PageModel._resolve_homepage_switch(db, current_page_id=page_b.id)

    db.refresh(page_a)
    db.refresh(content_a)

    assert page_a.is_homepage is False  # nosec B101
    assert content_a.slug != "/"  # nosec B101
    assert content_a.slug == "/home-page"  # nosec B101


def test_switch_homepage_preserves_non_root_slugs(
    db: Session, org: OrganizationModel, locale: LocaleModel
):
    """Non-root slugs on old homepage contents are left unchanged."""
    page_a = _make_page(db, org.id, is_homepage=True)
    content_a = _make_content(db, page_a, locale, org.id, "Home Page", "/")

    page_b = _make_page(db, org.id, is_homepage=False)
    # Give page_b a content with a non-root slug so we can verify it is untouched
    content_b = _make_content(db, page_b, locale, org.id, "Custom", "/custom-slug")
    db.commit()

    PageModel._resolve_homepage_switch(db, current_page_id=page_b.id)

    db.refresh(content_a)
    db.refresh(content_b)

    # page_a's root slug was regenerated
    assert content_a.slug != "/"  # nosec B101
    # page_b's non-root slug is untouched (resolve only touches old homepage)
    assert content_b.slug == "/custom-slug"  # nosec B101


def test_create_homepage_resolves_existing(
    db: Session, org: OrganizationModel, locale: LocaleModel
):
    """Creating a new homepage resolves the old homepage's slug."""
    page_a = _make_page(db, org.id, is_homepage=True)
    content_a = _make_content(db, page_a, locale, org.id, "Old Home", "/")
    db.commit()

    # _resolve_homepage_switch with no current_page_id (create scenario)
    PageModel._resolve_homepage_switch(db, current_page_id=None)

    db.refresh(page_a)
    db.refresh(content_a)

    assert page_a.is_homepage is False  # nosec B101
    assert content_a.slug != "/"  # nosec B101
    assert content_a.slug == "/old-home"  # nosec B101


def test_update_homepage_same_page_no_change(
    db: Session, org: OrganizationModel, locale: LocaleModel
):
    """Re-saving the current homepage does not alter its own slugs."""
    page_a = _make_page(db, org.id, is_homepage=True)
    content_a = _make_content(db, page_a, locale, org.id, "Home Page", "/")
    db.commit()

    # Calling resolve with current_page_id = page_a.id excludes page_a
    PageModel._resolve_homepage_switch(db, current_page_id=page_a.id)

    db.refresh(page_a)
    db.refresh(content_a)

    # page_a should be unaffected since it is excluded
    assert page_a.is_homepage is True  # nosec B101
    assert content_a.slug == "/"  # nosec B101


def test_switch_homepage_multiple_locales(
    db: Session,
    org: OrganizationModel,
    locale: LocaleModel,
    locale_fr: LocaleModel,
):
    """Both locale content slugs of old homepage are regenerated."""
    page_a = _make_page(db, org.id, is_homepage=True)
    content_en = _make_content(db, page_a, locale, org.id, "Home Page", "/")
    content_fr = _make_content(db, page_a, locale_fr, org.id, "Page Accueil", "/")

    page_b = _make_page(db, org.id, is_homepage=False)
    db.commit()

    PageModel._resolve_homepage_switch(db, current_page_id=page_b.id)

    db.refresh(page_a)
    db.refresh(content_en)
    db.refresh(content_fr)

    assert page_a.is_homepage is False  # nosec B101
    assert content_en.slug != "/"  # nosec B101
    assert content_fr.slug != "/"  # nosec B101
    assert content_en.slug == "/home-page"  # nosec B101
    assert content_fr.slug == "/page-accueil"  # nosec B101
